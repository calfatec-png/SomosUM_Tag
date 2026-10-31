import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PAGES_DIR = path.join(PUBLIC_DIR, 'pages');
const TAG_PAGES_DIR = path.join(PUBLIC_DIR, 'tag-pages');
const LOJA_PAGES_DIR = path.join(PUBLIC_DIR, 'loja-pages');
const DATA_DIR = path.join(ROOT, 'data');
const SEED_PATH = path.join(DATA_DIR, 'seed.json');
const RUNTIME_DB_PATH = path.join(DATA_DIR, 'runtime-db.json');

const MSU_ID = '7d7b2b25-05c2-4622-9efb-f88838578770';
const CLAUDEMIR_ID = '9d866689-a4ec-4c41-931c-df865c189a59';

// Load database (runtime-db.json if present, else seed.json)
function loadDb() {
  if (fs.existsSync(RUNTIME_DB_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(RUNTIME_DB_PATH, 'utf8'));
    } catch {}
  }
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  return seed;
}

const db = loadDb();

let saveTimer = null;
function persistDb() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(RUNTIME_DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    } catch {}
  }, 200);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
};

function sendJson(res, status, data, extraHeaders = {}) {
  const body = data === undefined ? '' : JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, Prefer, Range, Range-Unit, Accept, x-client-info, x-supabase-api-version, x-igex-inspection',
    'Access-Control-Expose-Headers': 'Content-Range, Range-Unit',
    ...extraHeaders,
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({ _raw: raw });
      }
    });
    req.on('error', () => resolve({}));
  });
}

function buildJwtSession(email = 'calfatec@gmail.com') {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 86400 * 30;
  const profile =
    (db.tables.profiles || []).find(
      (p) => (p.email || '').toLowerCase() === (email || '').toLowerCase()
    ) ||
    (db.tables.profiles || []).find((p) => p.id === CLAUDEMIR_ID) || {
      id: CLAUDEMIR_ID,
      email: 'calfatec@gmail.com',
      name: 'Claudemir',
      surname: 'Silva',
      church_id: MSU_ID,
    };

  const user = {
    id: profile.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: profile.email || 'calfatec@gmail.com',
    email_confirmed_at: '2026-09-06T21:58:33.742061Z',
    phone: profile.phone || '',
    confirmed_at: '2026-09-06T21:58:33.742061Z',
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {
      email: profile.email || 'calfatec@gmail.com',
      email_verified: true,
      name: [profile.name, profile.surname].filter(Boolean).join(' ') || 'Claudemir Silva',
      church_id: profile.church_id || MSU_ID,
    },
    identities: [],
    factors: [
      {
        id: 'factor-somossistem-totp-1',
        friendly_name: 'Painel SomosSistem',
        factor_type: 'totp',
        status: 'verified',
        created_at: '2026-09-06T21:58:33.742061Z',
        updated_at: '2026-09-06T21:58:33.742061Z',
      },
    ],
    created_at: profile.created_at || '2026-09-06T21:58:33.742061Z',
    updated_at: new Date().toISOString(),
  };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      aud: 'authenticated',
      exp,
      iat: now,
      iss: 'https://skzbdgxwvzhkhbhriuwd.supabase.co/auth/v1',
      sub: user.id,
      email: user.email,
      phone: '',
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
      role: 'authenticated',
      aal: 'aal2',
      amr: [
        { method: 'password', timestamp: now },
        { method: 'totp', timestamp: now },
      ],
      session_id: MSU_ID,
    })
  ).toString('base64url');

  return {
    access_token: `${header}.${payload}.somossistem_sig`,
    token_type: 'bearer',
    expires_in: 86400 * 30,
    expires_at: exp,
    refresh_token: 'somossistem-refresh-token',
    user,
  };
}

// Foreign-key join enricher for PostgREST `.select(...)`
function enrichRow(table, row, selectStr = '*') {
  const out = { ...row };

  if (table === 'profiles') {
    if (selectStr.includes('church:')) {
      const ch = (db.tables.church || []).find((c) => c.id === row.church_id) || null;
      out.church = ch;
    }
  } else if (table === 'church') {
    if (selectStr.includes('lp:church_lp')) {
      const lps = (db.tables.church_lp || []).filter((l) => l.church_id === row.id);
      out.lp = lps;
    }
  } else if (table === 'user_ministery') {
    if (selectStr.includes('ministery:')) {
      out.ministery = (db.tables.ministery || []).find((m) => m.id === row.ministery_id) || null;
    }
    if (selectStr.includes('profile:')) {
      out.profile = (db.tables.profiles || []).find((p) => p.id === row.user_id) || null;
    }
  } else if (table === 'ministery') {
    if (selectStr.includes('user_ministery(count)')) {
      const cnt = (db.tables.user_ministery || []).filter((um) => um.ministery_id === row.id).length;
      out.user_ministery = [{ count: cnt }];
    }
  } else if (table === 'doacao') {
    if (selectStr.includes('profile:')) {
      out.profile = (db.tables.profiles || []).find((p) => p.id === row.profile_id) || null;
    }
  } else if (table === 'inscricao') {
    if (selectStr.includes('profile:')) {
      out.profile = (db.tables.profiles || []).find((p) => p.id === row.profile_id) || null;
    }
    if (selectStr.includes('evento:')) {
      out.evento = (db.tables.evento || []).find((e) => e.id === row.evento_id) || null;
    }
  } else if (table === 'pastoral_contato') {
    if (selectStr.includes('autor:')) {
      out.autor = (db.tables.profiles || []).find((p) => p.id === row.falado_por) || { name: 'Claudemir Silva' };
    }
  } else if (table === 'pastoral_encaminhamento') {
    if (selectStr.includes('autor:')) {
      out.autor = (db.tables.profiles || []).find((p) => p.id === row.encaminhado_por) || { name: 'Claudemir Silva' };
    }
  } else if (table === 'pastoral_acompanhamento') {
    if (selectStr.includes('ovelha:')) {
      out.ovelha = (db.tables.profiles || []).find((p) => p.id === row.profile_id) || null;
    }
    if (selectStr.includes('pastor:')) {
      out.pastor = (db.tables.profiles || []).find((p) => p.id === row.pastor_id) || { id: CLAUDEMIR_ID, name: 'Claudemir Silva' };
    }
  } else if (table === 'financas_entrada') {
    if (selectStr.includes('conta:')) {
      out.conta = (db.tables.financas_conta || []).find((c) => c.id === row.conta_id) || null;
    }
    if (selectStr.includes('tipo:')) {
      out.tipo = (db.tables.financas_tipo_entrada || []).find((t) => t.id === row.tipo_id) || null;
    }
    if (selectStr.includes('categoria:')) {
      out.categoria = (db.tables.financas_categoria_entrada || []).find((c) => c.id === row.categoria_id) || null;
    }
  } else if (table === 'financas_saida' || table === 'financas_boleto_fixo') {
    if (selectStr.includes('conta:')) {
      out.conta = (db.tables.financas_conta || []).find((c) => c.id === row.conta_id) || null;
    }
    if (selectStr.includes('forma_pagamento:')) {
      out.forma_pagamento = (db.tables.financas_forma_pagamento || []).find((f) => f.id === row.forma_pagamento_id) || null;
    }
    if (selectStr.includes('departamento:')) {
      out.departamento = (db.tables.financas_departamento || []).find((d) => d.id === row.departamento_id) || null;
    }
    if (selectStr.includes('subcategoria:')) {
      out.subcategoria = (db.tables.financas_subcategoria || []).find((s) => s.id === row.subcategoria_id) || null;
    }
    if (selectStr.includes('recebedor:')) {
      out.recebedor = (db.tables.financas_recebedor || []).find((r) => r.id === row.recebedor_id) || null;
    }
  } else if (table === 'social_cesta') {
    if (selectStr.includes('itens:')) {
      const cis = (db.tables.social_cesta_item || []).filter((ci) => ci.cesta_id === row.id);
      out.itens = cis.map((ci) => ({
        ...ci,
        item: (db.tables.item || []).find((it) => it.id === ci.item_id) || null,
      }));
    }
  } else if (table === 'social_recebimento') {
    if (selectStr.includes('linhas:')) {
      const rls = (db.tables.social_recebimento_linha || []).filter((rl) => rl.recebimento_id === row.id);
      out.linhas = rls.map((rl) => ({
        ...rl,
        item: (db.tables.item || []).find((it) => it.id === rl.item_id) || null,
      }));
    }
  } else if (table === 'social_entrega') {
    if (selectStr.includes('familia:')) {
      out.familia = (db.tables.beneficiary || []).find((b) => b.id === row.familia_id) || null;
    }
    if (selectStr.includes('linhas:')) {
      const els = (db.tables.social_entrega_linha || []).filter((el) => el.entrega_id === row.id);
      out.linhas = els.map((el) => ({
        ...el,
        item: el.item_id ? (db.tables.item || []).find((it) => it.id === el.item_id) || null : null,
        cesta: el.cesta_id ? (db.tables.social_cesta || []).find((c) => c.id === el.cesta_id) || null : null,
      }));
    }
  } else if (table === 'social_request') {
    if (selectStr.includes('beneficiary:')) {
      out.beneficiary = (db.tables.beneficiary || []).find((b) => b.id === row.beneficiary_id) || null;
    }
    if (selectStr.includes('responsavel:')) {
      out.responsavel = (db.tables.profiles || []).find((p) => p.id === row.responsavel_id) || null;
    }
  }

  return out;
}

// Evaluate single PostgREST filter expression against a row value
function matchesOperator(rowVal, expr) {
  if (expr.startsWith('not.')) {
    return !matchesOperator(rowVal, expr.slice(4));
  }
  const dot = expr.indexOf('.');
  if (dot === -1) return true;
  const op = expr.slice(0, dot);
  const rawVal = expr.slice(dot + 1);

  if (op === 'eq') {
    if (rawVal === 'true') return rowVal === true;
    if (rawVal === 'false') return rowVal === false;
    if (rawVal === 'null') return rowVal === null || rowVal === undefined;
    return String(rowVal ?? '') === rawVal;
  }
  if (op === 'neq') {
    if (rawVal === 'true') return rowVal !== true;
    if (rawVal === 'false') return rowVal !== false;
    if (rawVal === 'null') return rowVal !== null && rowVal !== undefined;
    return String(rowVal ?? '') !== rawVal;
  }
  if (op === 'is') {
    if (rawVal === 'null') return rowVal === null || rowVal === undefined;
    if (rawVal === 'true') return rowVal === true;
    if (rawVal === 'false') return rowVal === false;
    return false;
  }
  if (op === 'in') {
    const inner = rawVal.replace(/^\(|\)$/g, '');
    if (!inner) return false;
    const parts = inner.split(',').map((s) => s.replace(/^"|"$/g, '').trim());
    return parts.includes(String(rowVal ?? ''));
  }
  if (op === 'gt') return rowVal != null && (typeof rowVal === 'number' ? rowVal > Number(rawVal) : String(rowVal) > rawVal);
  if (op === 'gte') return rowVal != null && (typeof rowVal === 'number' ? rowVal >= Number(rawVal) : String(rowVal) >= rawVal);
  if (op === 'lt') return rowVal != null && (typeof rowVal === 'number' ? rowVal < Number(rawVal) : String(rowVal) < rawVal);
  if (op === 'lte') return rowVal != null && (typeof rowVal === 'number' ? rowVal <= Number(rawVal) : String(rowVal) <= rawVal);
  if (op === 'ilike' || op === 'like') {
    const pattern = rawVal.replace(/%/g, '.*').replace(/\*/g, '.*');
    try {
      return new RegExp(`^${pattern}$`, op === 'ilike' ? 'i' : '').test(String(rowVal ?? ''));
    } catch {
      return String(rowVal ?? '').toLowerCase().includes(rawVal.toLowerCase());
    }
  }
  return true;
}

function filterRows(rows, searchParams) {
  let result = [...rows];
  const reserved = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);

  for (const [key, val] of searchParams.entries()) {
    if (reserved.has(key)) continue;
    if (key === 'or') {
      const inner = val.replace(/^\(|\)$/g, '');
      const clauses = inner.split(',');
      result = result.filter((row) =>
        clauses.some((cl) => {
          const d = cl.indexOf('.');
          if (d === -1) return false;
          const col = cl.slice(0, d);
          const rest = cl.slice(d + 1);
          return matchesOperator(row[col], rest);
        })
      );
      continue;
    }
    result = result.filter((row) => matchesOperator(row[key], val));
  }

  // Order
  const orderParams = searchParams.getAll('order');
  if (orderParams.length > 0) {
    const specs = orderParams.flatMap((o) => o.split(',')).map((s) => {
      const parts = s.trim().split('.');
      return { col: parts[0], desc: parts.includes('desc') };
    });
    result.sort((a, b) => {
      for (const { col, desc } of specs) {
        const va = a[col];
        const vb = b[col];
        if (va === vb) continue;
        if (va == null) return 1;
        if (vb == null) return -1;
        const cmp = va < vb ? -1 : 1;
        return desc ? -cmp : cmp;
      }
      return 0;
    });
  }

  return result;
}

// Handle PostgREST /supabase/rest/v1/:table
async function handleRestTable(req, res, table, searchParams) {
  if (!db.tables[table]) db.tables[table] = [];
  const selectStr = searchParams.get('select') || '*';
  const accept = req.headers['accept'] || '';
  const prefer = req.headers['prefer'] || '';
  const wantSingle = accept.includes('application/vnd.pgrst.object+json');

  if (req.method === 'GET' || req.method === 'HEAD') {
    const matched = filterRows(db.tables[table], searchParams);
    const total = matched.length;

    let start = 0;
    let end = matched.length - 1;

    if (searchParams.has('offset')) start = Number(searchParams.get('offset')) || 0;
    if (searchParams.has('limit')) {
      const lim = Number(searchParams.get('limit'));
      end = start + lim - 1;
    } else if (req.headers['range']) {
      const m = String(req.headers['range']).match(/(\d+)-(\d+)/);
      if (m) {
        start = Number(m[1]);
        end = Number(m[2]);
      }
    }

    const sliced = matched.slice(start, end + 1).map((r) => enrichRow(table, r, selectStr));

    // Special case: when `/mfa` queries `profiles?select=is_super_admin&id=eq....`, return is_super_admin: true if on /admin or /mfa
    if (table === 'profiles' && selectStr.trim() === 'is_super_admin' && sliced.length > 0) {
      const ref = req.headers['referer'] || '';
      if (ref.includes('/admin') || ref.includes('/mfa')) {
        sliced[0] = { ...sliced[0], is_super_admin: true };
      }
    }

    const rangeHeader =
      sliced.length > 0 ? `${start}-${start + sliced.length - 1}/${total}` : `*/${total}`;

    if (req.method === 'HEAD') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Range': rangeHeader,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Range, Range-Unit',
      });
      return res.end();
    }

    if (wantSingle) {
      if (sliced.length === 0) {
        return sendJson(res, 406, {
          code: 'PGRST116',
          details: 'The result contains 0 rows',
          hint: null,
          message: 'JSON object requested, multiple (or no) rows returned',
        });
      }
      return sendJson(res, 200, sliced[0], { 'Content-Range': rangeHeader });
    }

    return sendJson(res, 200, sliced, { 'Content-Range': rangeHeader });
  }

  if (req.method === 'POST') {
    const body = await readBody(req);
    const items = Array.isArray(body) ? body : [body];
    const onConflict = searchParams.get('on_conflict');
    const inserted = [];

    for (const item of items) {
      const now = new Date().toISOString();
      const row = {
        id: item.id || crypto.randomUUID(),
        created_at: item.created_at || now,
        ...item,
      };

      if (onConflict) {
        const cols = onConflict.split(',').map((c) => c.trim());
        const existingIdx = db.tables[table].findIndex((r) =>
          cols.every((c) => String(r[c] ?? '') === String(row[c] ?? ''))
        );
        if (existingIdx !== -1) {
          db.tables[table][existingIdx] = { ...db.tables[table][existingIdx], ...item, updated_at: now };
          inserted.push(enrichRow(table, db.tables[table][existingIdx], selectStr));
          continue;
        }
      }

      db.tables[table].push(row);
      inserted.push(enrichRow(table, row, selectStr));
    }

    persistDb();
    if (wantSingle) return sendJson(res, 201, inserted[0] || null);
    return sendJson(res, 201, inserted);
  }

  if (req.method === 'PATCH') {
    const body = await readBody(req);
    const matched = filterRows(db.tables[table], searchParams);
    const matchedIds = new Set(matched);
    const updated = [];
    const now = new Date().toISOString();

    db.tables[table] = db.tables[table].map((row) => {
      if (matchedIds.has(row)) {
        const next = { ...row, ...body, updated_at: body.updated_at || now };
        updated.push(enrichRow(table, next, selectStr));
        return next;
      }
      return row;
    });

    persistDb();
    if (wantSingle) {
      if (updated.length === 0) {
        return sendJson(res, 406, {
          code: 'PGRST116',
          details: 'The result contains 0 rows',
          hint: null,
          message: 'JSON object requested, multiple (or no) rows returned',
        });
      }
      return sendJson(res, 200, updated[0]);
    }
    return sendJson(res, 200, updated);
  }

  if (req.method === 'DELETE') {
    const matched = filterRows(db.tables[table], searchParams);
    const matchedSet = new Set(matched);
    db.tables[table] = db.tables[table].filter((r) => !matchedSet.has(r));
    persistDb();
    if (wantSingle) return sendJson(res, 200, matched[0] || null);
    return sendJson(res, 200, matched);
  }

  return sendJson(res, 200, []);
}

// Handle all 17 PostgREST RPCs (/supabase/rest/v1/rpc/:rpcName)
async function handleRpc(req, res, rpcName) {
  const body = req.method === 'POST' ? await readBody(req) : {};

  if (rpcName === 'superadmin_modulos_efetivos') {
    return sendJson(
      res,
      200,
      (db.tables.module || []).map((m) => m.key)
    );
  }

  if (rpcName === 'superadmin_sou_ator') {
    const ref = req.headers['referer'] || '';
    return sendJson(res, 200, ref.includes('/admin') || ref.includes('/mfa'));
  }

  if (rpcName === 'dashboard_agregado') {
    const churchId = body.p_church_id || MSU_ID;
    const cap = (db.tables.captacao || []).filter((c) => c.church_id === churchId);
    const doacoes = (db.tables.doacao || []).filter((d) => d.church_id === churchId);
    const inscricoes = (db.tables.inscricao || []).filter((i) => i.church_id === churchId);
    const membros = (db.tables.profiles || []).filter((p) => p.church_id === churchId && p.active && !p.is_super_admin);

    const oracoes = cap.filter((c) => c.type === 'PRAYER' || c.tipo === 'ORACAO').length || 28;
    const visitantes = cap.filter((c) => c.type === 'VISITOR' || c.tipo === 'VISITANTE').length || 64;
    const novosMembros = cap.filter((c) => c.type === 'MEMBER' || c.tipo === 'MEMBRO').length || 19;
    const doacoesTotal = doacoes.reduce((acc, d) => acc + Number(d.valor || 0), 0);

    return sendJson(res, 200, {
      since: body.p_since || '2026-09-23T00:00:00+00:00',
      until: body.p_until || new Date().toISOString(),
      oracoes,
      inscricoes: inscricoes.length,
      visitantes,
      doacoes_count: doacoes.length,
      doacoes_total: Math.round(doacoesTotal * 100) / 100,
      kids_checkins: 34,
      novos_membros: novosMembros,
      eventos_ativos: (db.tables.evento || []).filter((e) => e.church_id === churchId && !e.arquivado_em).length,
      membros_totais: membros.length,
      decisoes_cristo: 15,
      pedidos_membro: novosMembros,
      batizados_total: membros.filter((m) => m.baptized).length,
      doacoes_por_tipo: {
        OFERTA: 412.32,
        DIZIMO: 770.0,
      },
      social_concluidos: (db.tables.social_request || []).filter((s) => s.status === 'CONCLUIDO').length,
      doacoes_por_origem: {
        APP: 552.32,
        TAG: 630.0,
      },
      visitantes_por_como: {
        Convite: 38,
        Instagram: 18,
        Passando: 8,
      },
      membros_por_faixa_etaria: {
        '0_17': 12,
        '18_25': 26,
        '26_35': 44,
        '36_50': 38,
        '51_mais': 19,
        nao_informado: 0,
      },
      social_solicitacoes_periodo: (db.tables.social_request || []).length,
      social_beneficiarios_periodo: (db.tables.beneficiary || []).length,
    });
  }

  if (rpcName === 'dashboard_mensal') {
    return sendJson(res, 200, {
      year: body.p_year || 2026,
      doacoes: [1250, 1480, 1820, 2100, 1950, 2400, 2888.88, 3150, 3613.44, 4210.5, 0, 0],
      inscricoes: [4, 8, 12, 6, 15, 18, 22, 14, 19, 24, 0, 0],
      kids_checkins: [18, 22, 25, 20, 28, 30, 32, 29, 35, 38, 0, 0],
      novos_membros: [3, 5, 4, 6, 8, 7, 15, 11, 14, 19, 0, 0],
    });
  }

  if (rpcName === 'dashboard_tag_detalhe') {
    return sendJson(res, 200, {
      ...(db.rpcs?.dashboard_tag_detalhe || {}),
      oracoes_tag: 28,
      inscricoes_tag: 14,
      captacao_membros: 19,
      doacoes_tag_count: 18,
      doacoes_tag_total: 1840.0,
      captacao_visitantes: 64,
    });
  }

  if (rpcName === 'dashboard_atividade_recente') {
    return sendJson(res, 200, db.rpcs?.dashboard_atividade_recente || []);
  }

  if (rpcName === 'pastoral_atencao') {
    return sendJson(res, 200, db.rpcs?.pastoral_atencao || []);
  }

  if (rpcName === 'social_estoque_status') {
    const items = (db.tables.item || []).filter((i) => i.church_id === (body.p_church_id || MSU_ID));
    return sendJson(
      res,
      200,
      items.map((i) => ({
        item_id: i.id,
        name: i.name,
        category: i.category || 'Alimentos',
        unit: i.unit || 'un',
        quantity: Number(i.quantity || 0),
        min_quantity: Number(i.min_quantity || 0),
        peso: Number(i.peso || 1),
        status: Number(i.quantity || 0) <= Number(i.min_quantity || 0) ? 'BAIXO' : 'OK',
      }))
    );
  }

  if (rpcName === 'social_registrar_recebimento') {
    const recId = crypto.randomUUID();
    const churchId = body.p_church_id || MSU_ID;
    const linhas = body.p_linhas || [];
    db.tables.social_recebimento.unshift({
      id: recId,
      church_id: churchId,
      origem: body.p_origem || 'Doação Voluntária',
      observacao: body.p_observacao || null,
      registrado_por: CLAUDEMIR_ID,
      anulado_em: null,
      created_at: new Date().toISOString(),
    });
    for (const l of linhas) {
      db.tables.social_recebimento_linha.push({
        id: crypto.randomUUID(),
        recebimento_id: recId,
        item_id: l.item_id,
        qty: Number(l.qty || 1),
      });
      const it = db.tables.item.find((x) => x.id === l.item_id);
      if (it) it.quantity = Number(it.quantity || 0) + Number(l.qty || 0);
    }
    persistDb();
    return sendJson(res, 200, { id: recId });
  }

  if (rpcName === 'social_registrar_entrega') {
    const entId = crypto.randomUUID();
    const churchId = body.p_church_id || MSU_ID;
    const linhas = body.p_linhas || [];
    db.tables.social_entrega.unshift({
      id: entId,
      church_id: churchId,
      familia_id: body.p_familia_id,
      observacao: body.p_observacao || null,
      entregue_por: CLAUDEMIR_ID,
      anulada_em: null,
      created_at: new Date().toISOString(),
    });
    for (const l of linhas) {
      db.tables.social_entrega_linha.push({
        id: crypto.randomUUID(),
        entrega_id: entId,
        tipo: l.tipo || (l.cesta_id ? 'CESTA' : 'ITEM'),
        cesta_id: l.cesta_id || null,
        item_id: l.item_id || null,
        qty: Number(l.qty || 1),
      });
    }
    persistDb();
    return sendJson(res, 200, { id: entId });
  }

  if (rpcName === 'social_anular_recebimento' || rpcName === 'social_anular_entrega') {
    return sendJson(res, 200, { ok: true });
  }

  if (rpcName === 'social_familia_relampago') {
    const fam = {
      id: crypto.randomUUID(),
      church_id: body.p_church_id || MSU_ID,
      name: body.p_nome || 'Nova Família Atendida',
      phone: body.p_telefone || null,
      cpf: body.p_documento || null,
      family_size: Number(body.p_pessoas || 1),
      status: 'ATIVO',
      archived_at: null,
      created_at: new Date().toISOString(),
    };
    db.tables.beneficiary.unshift(fam);
    persistDb();
    return sendJson(res, 200, fam);
  }

  if (rpcName === 'social_gravar_receitas' || rpcName === 'financas_conciliar_extrato' || rpcName === 'apply_ministery_rules') {
    return sendJson(res, 200, { ok: true });
  }

  if (rpcName === 'financeiro_uso_avaliacao') {
    return sendJson(res, 200, []);
  }

  return sendJson(res, 200, db.rpcs?.[rpcName] ?? []);
}

// Generate dynamic Escalas data relative to today (with persistent confirmation & volunteer overrides)
function getEscalasData() {
  const now = new Date();
  const fmtDate = (offsetDays) => {
    const d = new Date(now.getTime() + offsetDays * 86400000);
    return d.toISOString().slice(0, 10);
  };

  const base = [
    {
      id: 'esc-somos-01',
      title: 'Culto da Família · Domingo',
      event_date: fmtDate(2),
      start_time: '18:30',
      ministry_name: 'Louvor & Adoração Somos Um',
      ministry_color: '#BF1F2C',
      pessoas: [
        { id: 'ep1', pessoa_id: '59a00c59-0f41-4dfd-9b66-cb2e43c37543', nome: 'Pastor Andre', funcao: 'Ministro de Louvor', status: 'CONFIRMED', desde: fmtDate(-5) },
        { id: 'ep2', pessoa_id: '2d80ef13-a56d-414b-bd73-98e68d40cebd', nome: 'Sunamita Martins', funcao: 'Vocal', status: 'CONFIRMED', desde: fmtDate(-4) },
        { id: 'ep3', pessoa_id: '5c42c6ae-7d4d-4107-9c8d-3805bccebbfc', nome: 'Ricardo Colauto', funcao: 'Teclado & Direção Musical', status: 'CONFIRMED', desde: fmtDate(-4) },
        { id: 'ep4', pessoa_id: '7daf72c1-4ff0-4f2a-8bc9-dfd5715d4511', nome: 'Célio de Oliveira Santos', funcao: 'Bateria', status: 'CONFIRMED', desde: fmtDate(-3) },
      ],
    },
    {
      id: 'esc-somos-02',
      title: 'Quarta que Fortalece',
      event_date: fmtDate(5),
      start_time: '19:30',
      ministry_name: 'Recepção & Boas-Vindas TAG',
      ministry_color: '#A61458',
      pessoas: [
        { id: 'ep5', pessoa_id: CLAUDEMIR_ID, nome: 'Claudemir Silva', funcao: 'Coordenação TAG & Acolhimento', status: 'CONFIRMED', desde: fmtDate(-3) },
        { id: 'ep6', pessoa_id: '2d80ef13-a56d-414b-bd73-98e68d40cebd', nome: 'Sunamita Martins', funcao: 'Boas-Vindas Porta Central', status: 'CONFIRMED', desde: fmtDate(-2) },
        { id: 'ep7', pessoa_id: '7daf72c1-4ff0-4f2a-8bc9-dfd5715d4511', nome: 'Célio de Oliveira Santos', funcao: 'Apoio Estacionamento', status: 'PENDING', desde: fmtDate(-2) },
      ],
    },
    {
      id: 'esc-somos-03',
      title: 'Culto da Família · Domingo',
      event_date: fmtDate(9),
      start_time: '18:30',
      ministry_name: 'Mídia, Projeção & Transmissão',
      ministry_color: '#0D3640',
      pessoas: [
        { id: 'ep8', pessoa_id: CLAUDEMIR_ID, nome: 'Claudemir Silva', funcao: 'Direção de Corte & Live', status: 'CONFIRMED', desde: fmtDate(-4) },
        { id: 'ep9', pessoa_id: '5c42c6ae-7d4d-4107-9c8d-3805bccebbfc', nome: 'Ricardo Colauto', funcao: 'Áudio Broadcast', status: 'CONFIRMED', desde: fmtDate(-3) },
        { id: 'ep10', pessoa_id: '59a00c59-0f41-4dfd-9b66-cb2e43c37543', nome: 'Pastor Andre', funcao: 'Supervisão Geral', status: 'CONFIRMED', desde: fmtDate(-3) },
      ],
    },
    {
      id: 'esc-somos-04',
      title: 'Ação Social Fé com Pão',
      event_date: fmtDate(-4),
      start_time: '09:00',
      ministry_name: 'Fé com Pão · Social',
      ministry_color: '#BF0F70',
      pessoas: [
        { id: 'ep11', pessoa_id: CLAUDEMIR_ID, nome: 'Claudemir Silva', funcao: 'Coordenação de Entregas', status: 'CONFIRMED', desde: fmtDate(-10) },
        { id: 'ep12', pessoa_id: '2d80ef13-a56d-414b-bd73-98e68d40cebd', nome: 'Sunamita Martins', funcao: 'Cadastro de Famílias', status: 'CONFIRMED', desde: fmtDate(-10) },
        { id: 'ep13', pessoa_id: '7daf72c1-4ff0-4f2a-8bc9-dfd5715d4511', nome: 'Célio de Oliveira Santos', funcao: 'Logística de Cestas', status: 'CONFIRMED', desde: fmtDate(-10) },
      ],
    },
  ];

  const statusOverrides = db.escala_status_overrides || {};
  const extraPessoas = db.escala_extra_pessoas || {};

  return base.map((esc) => {
    const extras = Array.isArray(extraPessoas[esc.id]) ? extraPessoas[esc.id] : [];
    const pessoas = [...esc.pessoas, ...extras].map((p) => {
      const overrideKey = `${esc.id}:${p.id}`;
      const personKey = `${esc.id}:${p.pessoa_id}`;
      const newStatus = statusOverrides[overrideKey] || statusOverrides[personKey] || p.status;
      return { ...p, status: newStatus };
    });
    const confirmed = pessoas.filter((p) => p.status === 'CONFIRMED').length;
    const pending = pessoas.length - confirmed;
    return {
      ...esc,
      total: pessoas.length,
      confirmed,
      pending,
      pessoas,
    };
  });
}

// Built-in Portuguese Bible verses for TAG Bible reader (/api/bible)
const BIBLE_VERSES = {
  default: [
    { number: 1, text: 'Para que todos sejam um, Pai, como tu estás em mim e eu em ti. Que eles também estejam em nós, para que o mundo creia que tu me enviaste. (João 17:21)' },
    { number: 2, text: 'Eu lhes tenho transmitido a glória que me tens dado, para que sejam um, como nós o somos.' },
    { number: 3, text: 'Eu neles, e tu em mim, a fim de que sejam aperfeiçoados na unidade, para que o mundo conheça que tu me enviaste e os amaste, como também amaste a mim.' },
    { number: 4, text: 'Oh! Quão bom e quão suave é que os irmãos vivam em união!' },
    { number: 5, text: 'Porque ali o Senhor ordena a bênção e a vida para sempre.' },
  ],
};

// Handle all /api/* routes
async function handleApi(req, res, pathname, searchParams) {
  // 1. Acessos por área (/api/acessos/areas)
  if (pathname === '/api/acessos/areas') {
    if (req.method === 'GET') {
      return sendJson(res, 200, {
        areas: [
          { area: 'PASTORAL', nome: 'Pastoral', login: 'pastoral.msu@acesso.somossistem.com', existe: true, ultimoAcesso: new Date(Date.now() - 7200000).toISOString() },
          { area: 'SOCIAL', nome: 'Social', login: 'social.msu@acesso.somossistem.com', existe: true, ultimoAcesso: new Date(Date.now() - 18000000).toISOString() },
          { area: 'FINANCEIRO', nome: 'Finanças', login: 'financeiro.msu@acesso.somossistem.com', existe: true, ultimoAcesso: new Date(Date.now() - 3600000).toISOString() },
          { area: 'TAG', nome: 'TAG', login: 'tag.msu@acesso.somossistem.com', existe: true, ultimoAcesso: new Date(Date.now() - 43200000).toISOString() },
          { area: 'ESCALAS', nome: 'Escalas', login: 'escalas.msu@acesso.somossistem.com', existe: true, ultimoAcesso: new Date(Date.now() - 86400000).toISOString() },
        ],
      });
    }
    if (req.method === 'POST' || req.method === 'DELETE') {
      return sendJson(res, 200, { ok: true, mensagem: 'Configuração de acesso da área atualizada com sucesso.' });
    }
  }

  // 2. Escalas (/api/escala & /api/escala/confirmar)
  if (pathname === '/api/escala') {
    return sendJson(res, 200, { linked: true, data: getEscalasData() });
  }

  if (pathname === '/api/escala/confirmar' && req.method === 'POST') {
    const body = await readBody(req);
    db.escala_status_overrides = db.escala_status_overrides || {};
    db.escala_extra_pessoas = db.escala_extra_pessoas || {};
    const escalaId = body.escala_id || 'esc-somos-02';
    if (body.action === 'add_volunteer' && body.nome) {
      db.escala_extra_pessoas[escalaId] = db.escala_extra_pessoas[escalaId] || [];
      db.escala_extra_pessoas[escalaId].push({
        id: `ep_${Date.now()}`,
        pessoa_id: body.pessoa_id || crypto.randomUUID(),
        nome: body.nome,
        funcao: body.funcao || 'Voluntário Escalado',
        status: body.status || 'CONFIRMED',
        desde: new Date().toISOString().slice(0, 10),
      });
    } else {
      const key = `${escalaId}:${body.id || body.pessoa_id || 'ep7'}`;
      db.escala_status_overrides[key] = body.status || 'CONFIRMED';
    }
    persistDb();
    return sendJson(res, 200, { ok: true, linked: true, data: getEscalasData() });
  }

  // 2b. Painel de Operação & Voluntários (/api/voluntarios/painel, /api/voluntarios/cadastro, /api/voluntarios/demanda, /api/ajuda)
  if (pathname === '/api/voluntarios/painel' && req.method === 'GET') {
    const escalas = getEscalasData();
    const ministerios = (db.tables.ministery || []).filter((m) => m.church_id === MSU_ID);
    const userMin = db.tables.user_ministery || [];
    const profiles = (db.tables.profiles || []).filter((p) => p.church_id === MSU_ID && p.active !== false);
    const voluntarios = profiles.map((p) => {
      const mins = userMin
        .filter((um) => um.user_id === p.id)
        .map((um) => ministerios.find((m) => m.id === um.ministery_id)?.name)
        .filter(Boolean);
      return {
        id: p.id,
        name: p.name,
        email: p.email || '',
        phone: p.phone || '(14) 98144-7428',
        role: p.role || 'VOLUNTÁRIO',
        ministerios: mins.length ? mins : ['Acolhimento & Boas-Vindas'],
        created_at: p.created_at,
      };
    });
    const demandasSociais = (db.tables.social_request || []).filter((r) => r.church_id === MSU_ID);
    const demandasCaptacao = (db.tables.captacao || []).filter((c) => c.church_id === MSU_ID);
    const eventos = (db.tables.evento || []).filter((e) => e.church_id === MSU_ID && !e.arquivado_em);
    const grupos = (db.tables.church_lp_grupo || []).filter((g) => g.church_id === MSU_ID);

    return sendJson(res, 200, {
      ok: true,
      resumo: {
        totalVoluntarios: voluntarios.length,
        totalMinisterios: ministerios.length,
        escalasAtivas: escalas.length,
        confirmacoesPendentes: escalas.reduce((acc, e) => acc + (e.pending || 0), 0),
        demandasSociaisPendentes: demandasSociais.filter((d) => d.status !== 'CONCLUIDO' && d.status !== 'ENTREGUE').length,
        pedidosOracaoVisitantes: demandasCaptacao.filter((c) => c.status === 'NOVO').length,
      },
      escalas,
      ministerios,
      voluntarios,
      demandasSociais,
      demandasCaptacao,
      eventos,
      grupos,
    });
  }

  if (pathname === '/api/voluntarios/cadastro' && req.method === 'POST') {
    const body = await readBody(req);
    const newId = crypto.randomUUID();
    const newProfile = {
      id: newId,
      church_id: MSU_ID,
      name: body.name || 'Novo Voluntário Somos Um',
      surname: null,
      email: body.email || null,
      phone: body.phone || null,
      active: true,
      role: 'MEMBRO',
      is_visitor: false,
      is_super_admin: false,
      created_at: new Date().toISOString(),
    };
    db.tables.profiles.unshift(newProfile);

    const ministerios = (db.tables.ministery || []).filter((m) => m.church_id === MSU_ID);
    const matchedMin =
      ministerios.find((m) => m.id === body.ministery_id || (body.ministerio && m.name.toLowerCase().includes(String(body.ministerio).toLowerCase()))) ||
      ministerios[0];

    if (matchedMin) {
      db.tables.user_ministery.push({
        id: crypto.randomUUID(),
        user_id: newId,
        ministery_id: matchedMin.id,
        church_id: MSU_ID,
        role: body.funcao || 'Voluntário',
        created_at: new Date().toISOString(),
      });
    }

    if (body.escala_id) {
      db.escala_extra_pessoas = db.escala_extra_pessoas || {};
      db.escala_extra_pessoas[body.escala_id] = db.escala_extra_pessoas[body.escala_id] || [];
      db.escala_extra_pessoas[body.escala_id].push({
        id: `ep_${Date.now()}`,
        pessoa_id: newId,
        nome: newProfile.name,
        funcao: body.funcao || matchedMin?.name || 'Voluntário',
        status: 'CONFIRMED',
        desde: new Date().toISOString().slice(0, 10),
      });
    }

    db.tables.captacao.unshift({
      id: crypto.randomUUID(),
      church_id: MSU_ID,
      type: 'MEMBER',
      name: newProfile.name,
      email: newProfile.email,
      phone: newProfile.phone,
      prayer_request: `Voluntário disponível (${body.disponibilidade || ' Domingos e Quartas'}) · Ministério: ${matchedMin?.name || body.ministerio || 'Geral'}`,
      how_found: 'Portal de Voluntários SomosSistem',
      custom_answers: { ministerio: matchedMin?.name || body.ministerio || 'Geral', funcao: body.funcao || 'Voluntário', disponibilidade: body.disponibilidade || 'Integral' },
      status: 'ATENDIDO',
      created_at: new Date().toISOString(),
    });

    persistDb();
    return sendJson(res, 200, { ok: true, id: newId, volunteer: newProfile, ministery: matchedMin?.name || 'Geral' });
  }

  if (pathname === '/api/voluntarios/demanda' && req.method === 'POST') {
    const body = await readBody(req);
    const kind = body.kind || 'social';
    if (kind === 'social') {
      const item = (db.tables.social_request || []).find((r) => r.id === body.id);
      if (item) {
        item.status = body.status || 'APROVADO';
        item.updated_at = new Date().toISOString();
      }
    } else {
      const item = (db.tables.captacao || []).find((c) => c.id === body.id);
      if (item) {
        item.status = body.status || 'ATENDIDO';
      }
    }
    persistDb();
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/ajuda' && req.method === 'POST') {
    const body = await readBody(req);
    const tipo = body.tipo || 'ORACAO';
    if (tipo === 'SOCIAL' || tipo === 'CESTA') {
      const reqItem = {
        id: crypto.randomUUID(),
        church_id: MSU_ID,
        requester_name: body.name || 'Solicitante Comunidade',
        requester_phone: body.phone || '',
        description: body.description || body.request || 'Solicitação de apoio social / cesta básica Fé com Pão',
        family_size: Number(body.family_size || 3),
        urgency: body.urgency || 'ALTA',
        status: 'PENDENTE',
        source: 'PORTAL_COMUNIDADE',
        created_at: new Date().toISOString(),
      };
      db.tables.social_request.unshift(reqItem);
      persistDb();
      return sendJson(res, 200, { ok: true, id: reqItem.id, tipo: 'SOCIAL' });
    }
    const row = {
      id: crypto.randomUUID(),
      church_id: MSU_ID,
      type: tipo === 'VISITA' ? 'VISITOR' : 'PRAYER',
      name: body.name || 'Comunidade Somos Um',
      email: body.email || null,
      phone: body.phone || null,
      prayer_request: body.request || body.description || 'Pedido de apoio/oração enviado pelo Portal',
      how_found: body.how_found || 'Portal Comunidade',
      custom_answers: body.custom_answers || {},
      status: 'NOVO',
      created_at: new Date().toISOString(),
    };
    db.tables.captacao.unshift(row);
    persistDb();
    return sendJson(res, 200, { ok: true, id: row.id, tipo });
  }

  // 3. Finanças Cotação (/api/financas/cotacao)
  if (pathname === '/api/financas/cotacao') {
    return sendJson(res, 200, { cotacao: 5.12, data: new Date().toISOString().slice(0, 10) });
  }

  // 4. SuperAdmin Igrejas & Dashboard (/api/admin/superadmin/igrejas)
  if (pathname === '/api/admin/superadmin/igrejas') {
    const churches = db.tables.church || [];
    const planos = db.superadmin?.planos || [];

    if (searchParams.get('exportar') === '1') {
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="igrejas-somossistem.csv"',
      });
      return res.end('Nome,Slug,Cidade,CNPJ,Plano,Situacao\n' + churches.map((c) => `"${c.name}","${c.slug || ''}","${c.cidade || ''}","${c.cnpj || ''}","${c.plano || 'completo'}","${c.suspensa_em ? 'Suspensa' : 'Ativa'}"`).join('\n'));
    }

    const situacao = searchParams.get('situacao') || '';
    const planoFilter = searchParams.get('plano') || '';
    const busca = (searchParams.get('busca') || '').toLowerCase().trim();

    let items = churches.map((c) => ({
      id: c.id,
      name: c.name,
      cidade: c.cidade || c.pix_merchant_city || 'Botucatu · SP',
      plano: c.plano || (c.id === MSU_ID ? 'completo' : 'essencial'),
      cnpj: c.cnpj || (c.pix_key && c.pix_key.length === 14 ? c.pix_key : '46.328.262/0001-80'),
      tags_enviadas: c.id === MSU_ID ? 200 : 100,
      suspensa_em: c.suspensa_em || null,
      ultimo_acesso: new Date(Date.now() - 1800000).toISOString(),
    }));

    // Prioritize Ministério Somos Um at the top
    items.sort((a, b) => (a.id === MSU_ID ? -1 : b.id === MSU_ID ? 1 : a.name.localeCompare(b.name)));

    if (situacao === 'ativas') items = items.filter((i) => !i.suspensa_em);
    if (situacao === 'suspensas') items = items.filter((i) => !!i.suspensa_em);
    if (planoFilter) items = items.filter((i) => (planoFilter === 'nulo' ? !i.plano : i.plano === planoFilter));
    if (busca) {
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(busca) ||
          (i.cidade || '').toLowerCase().includes(busca) ||
          (i.cnpj || '').toLowerCase().includes(busca)
      );
    }

    const allMods = ['tag', 'metricas', 'galeria', 'forms', 'pastoral', 'financas', 'social', 'escala', 'editor'];
    return sendJson(res, 200, {
      total: items.length,
      limite: 25,
      planos,
      items,
      resumo: {
        mrr: churches.filter((c) => !c.suspensa_em).length * 34900,
        mrrSuspensas: 19900,
        ativas: churches.filter((c) => !c.suspensa_em).length,
        novasNoMes: 4,
        tags: 3450,
        pedidos: 1,
        semAcesso: 0,
        meses: [
          { chave: '2025-11', nome: 'nov', total: 2 },
          { chave: '2025-12', nome: 'dez', total: 3 },
          { chave: '2026-01', nome: 'jan', total: 2 },
          { chave: '2026-02', nome: 'fev', total: 4 },
          { chave: '2026-03', nome: 'mar', total: 3 },
          { chave: '2026-04', nome: 'abr', total: 5 },
          { chave: '2026-05', nome: 'mai', total: 4 },
          { chave: '2026-06', nome: 'jun', total: 6 },
          { chave: '2026-07', nome: 'jul', total: 8 },
          { chave: '2026-08', nome: 'ago', total: 7 },
          { chave: '2026-09', nome: 'set', total: 9 },
          { chave: '2026-10', nome: 'out', total: 11 },
        ],
      },
      adocao: allMods.flatMap((m) =>
        churches.slice(0, 22).map((c) => ({ modulo: m, church_id: c.id }))
      ),
      eligiveis: churches.map((c) => ({ id: c.id, modulos: allMods })),
    });
  }

  // 5. SuperAdmin Ficha da Igreja (/api/admin/superadmin/ficha)
  if (pathname === '/api/admin/superadmin/ficha') {
    const id = searchParams.get('id') || MSU_ID;
    const c = (db.tables.church || []).find((x) => x.id === id) || (db.tables.church || [])[0];
    const mods = (db.tables.church_module || [])
      .filter((m) => m.church_id === c.id && m.enabled)
      .map((m) => m.module_key);
    return sendJson(res, 200, {
      igreja: {
        id: c.id,
        name: c.name,
        cidade: c.cidade || 'Botucatu · SP',
        cnpj: c.cnpj || '46.328.262/0001-80',
        created_at: c.created_at || '2026-07-20T01:51:58.254171+00:00',
        plano: c.plano || 'completo',
        suspensa_em: c.suspensa_em || null,
        suspensao_motivo: c.suspensao_motivo || null,
        responsavel: 'Claudemir Silva / Pr. André Ribeiro',
        email: 'calfatec@gmail.com',
        telefone: '(14) 98144-7428',
        ultimo_acesso: new Date().toISOString(),
        tags_enviadas: 200,
        pedidos_pendentes: 0,
        modulos: mods.length ? mods : ['tag', 'metricas', 'galeria', 'forms', 'pastoral', 'financas', 'social', 'escala', 'editor'],
      },
      planos: db.superadmin?.planos || [],
      acessos: {
        principal: 'calfatec@gmail.com',
        areas: [
          { area: 'PASTORAL', existe: true, login: 'pastoral.msu@acesso.somossistem.com', ultimoAcesso: new Date().toISOString() },
          { area: 'SOCIAL', existe: true, login: 'social.msu@acesso.somossistem.com', ultimoAcesso: new Date().toISOString() },
          { area: 'FINANCEIRO', existe: true, login: 'financeiro.msu@acesso.somossistem.com', ultimoAcesso: new Date().toISOString() },
          { area: 'TAG', existe: true, login: 'tag.msu@acesso.somossistem.com', ultimoAcesso: new Date().toISOString() },
        ],
      },
      academy: { alunos: 18, cursos: 2 },
    });
  }

  // 6. SuperAdmin Planos (/api/admin/superadmin/planos)
  if (pathname === '/api/admin/superadmin/planos') {
    if (req.method === 'GET') {
      return sendJson(res, 200, { planos: db.superadmin?.planos || [] });
    }
    if (req.method === 'POST') {
      const body = await readBody(req);
      db.superadmin.planos = (db.superadmin.planos || []).map((p) =>
        p.codigo === body.codigo ? { ...p, ...body } : p
      );
      persistDb();
      return sendJson(res, 200, { ok: true });
    }
  }

  // 7. SuperAdmin Auditoria (/api/admin/superadmin/auditoria)
  if (pathname === '/api/admin/superadmin/auditoria') {
    const items = db.superadmin?.auditoria || [];
    if (searchParams.get('exportar') === '1') {
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="auditoria-somossistem.csv"',
      });
      return res.end('Quando,Igreja,Acao,Resumo,Ator\n' + items.map((i) => `"${i.quando}","${i.igreja || ''}","${i.acao}","${i.resumo}","${i.ator}"`).join('\n'));
    }
    return sendJson(res, 200, { total: items.length, limite: 30, items });
  }

  // 8. SuperAdmin Inspeção, Ação, Reenviar, Registro
  if (pathname === '/api/admin/superadmin/inspecao') {
    if (req.method === 'DELETE') return sendJson(res, 200, { ok: true });
    const body = await readBody(req);
    const ch = (db.tables.church || []).find((c) => c.id === body.churchId) || { id: MSU_ID, name: 'Ministério Somos Um' };
    const now = Date.now();
    return sendJson(res, 200, {
      inspecao: {
        id: crypto.randomUUID(),
        atorId: CLAUDEMIR_ID,
        churchId: ch.id,
        name: ch.name,
        startedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 1800000).toISOString(),
      },
    });
  }

  if (pathname === '/api/admin/superadmin/acao') {
    const body = await readBody(req);
    const ch = (db.tables.church || []).find((c) => c.id === body.churchId);
    if (ch) {
      if (body.acao === 'suspender') {
        ch.suspensa_em = new Date().toISOString();
        ch.suspensao_motivo = body.motivo || 'Suspenso via SuperAdmin';
      } else if (body.acao === 'reativar') {
        ch.suspensa_em = null;
        ch.suspensao_motivo = null;
      } else if (body.acao === 'plano') {
        ch.plano = body.valor;
      }
      persistDb();
    }
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/admin/superadmin/reenviar') {
    return sendJson(res, 200, { ok: true, mensagem: 'Link de acesso reenviado para o e-mail principal.' });
  }

  if (pathname === '/api/admin/superadmin/registro') {
    const body = await readBody(req);
    db.superadmin.auditoria.unshift({
      id: crypto.randomUUID(),
      quando: new Date().toISOString(),
      resumo: body.summary || body.action || 'Ação registrada na plataforma',
      sensivel: false,
      igreja: 'Ministério Somos Um',
      acao: body.action || 'superadmin.action',
      motivo: null,
      duracao_segundos: null,
      alteracao: null,
      ator: 'calfatec@gmail.com',
      origem: 'SomosSistem',
      ip: '127.0.0.1',
    });
    persistDb();
    return sendJson(res, 200, { ok: true });
  }

  // 9. SuperAdmin Churches & Modules & Loja Provisionar
  if (pathname === '/api/admin/churches' || pathname === '/api/admin/loja/provisionar') {
    const body = await readBody(req);
    const newId = crypto.randomUUID();
    db.tables.church.unshift({
      id: newId,
      name: body.name || 'Nova Igreja SomosSistem',
      slug: body.slug || 'nova-igreja',
      plano: 'completo',
      cidade: 'São Paulo · SP',
      created_at: new Date().toISOString(),
    });
    for (const m of body.modules || ['tag', 'metricas', 'pastoral', 'financas', 'social']) {
      db.tables.church_module.push({
        church_id: newId,
        module_key: m,
        enabled: true,
        created_at: new Date().toISOString(),
      });
    }
    persistDb();
    return sendJson(res, 200, { ok: true, churchId: newId });
  }

  if (pathname === '/api/admin/churches/modulos') {
    const body = await readBody(req);
    const existing = (db.tables.church_module || []).find(
      (m) => m.church_id === body.church_id && m.module_key === body.module_key
    );
    if (existing) {
      existing.enabled = !!body.enabled;
    } else {
      db.tables.church_module.push({
        church_id: body.church_id || MSU_ID,
        module_key: body.module_key,
        enabled: !!body.enabled,
        created_at: new Date().toISOString(),
      });
    }
    persistDb();
    return sendJson(res, 200, { ok: true });
  }

  // 10. SuperAdmin AI Agent (/api/admin/agente)
  if (pathname === '/api/admin/agente') {
    const convs = db.superadmin?.conversas_agente || [];
    const convId = searchParams.get('conversa_id');
    if (req.method === 'GET') {
      if (convId) {
        const found = convs.find((c) => c.conversa_id === convId) || convs[0];
        return sendJson(res, 200, found || { conversa_id: convId, mensagens: [], pendencia: false });
      }
      return sendJson(
        res,
        200,
        {
          conversas: convs.map((c) => ({
            conversa_id: c.conversa_id,
            titulo: c.titulo,
            atualizada_em: c.atualizada_em,
          })),
        }
      );
    }
    if (req.method === 'POST') {
      const body = await readBody(req);
      let conv = convs.find((c) => c.conversa_id === body.conversa_id);
      if (!conv) {
        conv = {
          conversa_id: crypto.randomUUID(),
          titulo: (body.mensagem || 'Nova Consulta SomosSistem').slice(0, 48),
          atualizada_em: new Date().toISOString(),
          pendencia: false,
          mensagens: [],
        };
        convs.unshift(conv);
      }
      if (body.mensagem) {
        conv.mensagens.push({
          id: crypto.randomUUID(),
          papel: 'user',
          texto: body.mensagem,
          criada_em: new Date().toISOString(),
        });
        conv.mensagens.push({
          id: crypto.randomUUID(),
          papel: 'assistant',
          texto: `Análise concluída pelo **Agente SomosSistem**: O **Ministério Somos Um** possui **${(db.tables.profiles || []).filter((p) => p.church_id === MSU_ID).length} pessoas cadastradas**, **${(db.tables.captacao || []).filter((c) => c.church_id === MSU_ID).length} interações na TAG NFC** e todos os 14 módulos habilitados.`,
          criada_em: new Date().toISOString(),
        });
        conv.atualizada_em = new Date().toISOString();
      }
      persistDb();
      return sendJson(res, 200, conv);
    }
    if (req.method === 'DELETE') {
      db.superadmin.conversas_agente = convs.filter((c) => c.conversa_id !== convId);
      persistDb();
      return sendJson(res, 200, { ok: true });
    }
  }

  // 11. Editor SomosSistem (/api/editor/trabalhos, /api/admin/editor/trabalhos)
  if (pathname === '/api/editor/trabalhos' || pathname === '/api/admin/editor/trabalhos') {
    const trabalhos = db.superadmin?.editor_trabalhos || [];
    if (req.method === 'GET') {
      return sendJson(res, 200, { trabalhos, processador: 'http' });
    }
    if (req.method === 'POST') {
      const body = await readBody(req);
      const novo = {
        id: crypto.randomUUID(),
        church_id: MSU_ID,
        nome: body.nome || 'Culto da Família · Ministério Somos Um.mp4',
        duracao: body.duracao || 1800,
        tamanho: body.tamanho || 250000000,
        envio: 'enviado',
        criadoEm: new Date().toISOString(),
        visto: false,
        versoes: [
          {
            id: crypto.randomUUID(),
            numero: 1,
            rotulo: 'V1 · Edição Automática SomosSistem',
            estado: 'pronto',
            percentual: 100,
            etapa: 'Finalizado',
            escolhas: { zoom: 110, lut: true, som: 'automatico' },
            criado_em: new Date().toISOString(),
            pronto_em: new Date().toISOString(),
            visto_em: null,
            substituida_em: null,
            falha: null,
          },
        ],
      };
      trabalhos.unshift(novo);
      persistDb();
      return sendJson(res, 200, { trabalho: novo, urlUpload: '/supabase/storage/v1/object/editor/video.mp4' });
    }
  }

  if (pathname.startsWith('/api/editor/trabalhos/')) {
    const parts = pathname.split('/');
    const trabId = parts[4];
    const sub = parts[5];
    const trabalhos = db.superadmin?.editor_trabalhos || [];
    const trab = trabalhos.find((t) => t.id === trabId) || trabalhos[0];

    if (sub === 'arquivo') {
      return sendJson(res, 200, { url: '/assets/logo-somos-um.png' });
    }
    if (sub === 'versoes' && req.method === 'POST') {
      const body = await readBody(req);
      if (trab) {
        const num = (trab.versoes?.length || 0) + 1;
        trab.versoes.push({
          id: crypto.randomUUID(),
          numero: num,
          rotulo: `V${num} · Reprocessado`,
          estado: 'pronto',
          percentual: 100,
          etapa: 'Finalizado',
          escolhas: body.escolhas || { zoom: 100, lut: false, som: 'automatico' },
          criado_em: new Date().toISOString(),
          pronto_em: new Date().toISOString(),
          visto_em: null,
          substituida_em: null,
          falha: null,
        });
        persistDb();
      }
      return sendJson(res, 200, { trabalho: trab });
    }
    if (req.method === 'PATCH' && trab) {
      trab.visto = true;
      return sendJson(res, 200, { trabalho: trab });
    }
    return sendJson(res, 200, { trabalho: trab, ok: true });
  }

  // 12. Academy Videos (/api/academy/aulas/:id/video & /api/admin/academy/*)
  if (pathname.startsWith('/api/academy/aulas/') || pathname.startsWith('/api/admin/academy/')) {
    return sendJson(res, 200, {
      ok: true,
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      expiraEm: new Date(Date.now() + 3600000).toISOString(),
    });
  }

  // 13. Captacao Promote (/api/captacao/promote)
  if (pathname === '/api/captacao/promote' && req.method === 'POST') {
    const body = await readBody(req);
    const cap = (db.tables.captacao || []).find((c) => c.id === body.captacaoId || c.id === body.id);
    const newProfile = {
      id: crypto.randomUUID(),
      church_id: MSU_ID,
      name: cap?.name || body.name || 'Novo Membro',
      surname: null,
      email: cap?.email || body.email || null,
      phone: cap?.phone || body.phone || null,
      active: true,
      role: 'MEMBRO',
      is_visitor: false,
      is_super_admin: false,
      created_at: new Date().toISOString(),
    };
    db.tables.profiles.unshift(newProfile);
    if (cap) cap.promoted_profile_id = newProfile.id;
    persistDb();
    return sendJson(res, 200, { ok: true, profileId: newProfile.id, profile: newProfile });
  }

  // 14. TAG Public Church Page API (/api/lp-data)
  if (pathname === '/api/lp-data') {
    const slug = (searchParams.get('slug') || 'msu').toLowerCase();
    const ch =
      (db.tables.church || []).find((c) => (c.slug || '').toLowerCase() === slug) ||
      (db.tables.church || []).find((c) => c.id === MSU_ID);
    const lp =
      (db.tables.church_lp || []).find((l) => l.church_id === ch?.id) ||
      (db.tables.church_lp || [])[0] ||
      {};
    const events = (db.tables.evento || []).filter((e) => e.church_id === (ch?.id || MSU_ID) && !e.arquivado_em);
    const groups = (db.tables.church_lp_grupo || []).filter((g) => g.church_id === (ch?.id || MSU_ID));

    return sendJson(res, 200, {
      church: {
        ...ch,
        ...lp,
        id: ch?.id || MSU_ID,
        name: ch?.name || 'Ministério Somos Um',
        slug: ch?.slug || 'msu',
        logo_url: ch?.logo_url || '/assets/simbolo-somos-um.png',
        splash_url: ch?.splash_url || '/assets/logo-somos-um.png',
        primary_color: ch?.primary_color || '#BF1F2C',
        secondary_color: ch?.secondary_color || '#0D3640',
        theme: {
          primary: '#BF1F2C',
          secondary: '#0D3640',
          background: '#FAFAF7',
        },
        pix_key: ch?.pix_key || '46328262000180',
      },
      events,
      groups,
    });
  }

  // 15. TAG Public Forms (/api/prayer-requests, /api/visitors, /api/members, /api/lp/track)
  if (pathname === '/api/lp/track') {
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/prayer-requests' || pathname === '/api/visitors' || pathname === '/api/members') {
    const body = await readBody(req);
    const typeMap = {
      '/api/prayer-requests': 'PRAYER',
      '/api/visitors': 'VISITOR',
      '/api/members': 'MEMBER',
    };
    const row = {
      id: crypto.randomUUID(),
      church_id: MSU_ID,
      type: typeMap[pathname],
      name: body.name || (body.anonymous ? 'Anônimo' : 'Visitante TAG'),
      email: body.email || null,
      phone: body.phone || null,
      prayer_request: body.request || null,
      how_found: body.how_found || 'TAG NFC',
      custom_answers: body.custom_answers || {},
      status: 'NOVO',
      created_at: new Date().toISOString(),
    };
    db.tables.captacao.unshift(row);
    persistDb();
    return sendJson(res, 200, { ok: true, id: row.id });
  }

  // 16. TAG Events Registration & Bible
  if (pathname.startsWith('/api/events/')) {
    const parts = pathname.split('/');
    const evId = parts[3];
    const action = parts[4];
    if (action === 'registration-fields') {
      const fields = (db.tables.evento_campo_inscricao || []).filter((f) => f.evento_id === evId);
      return sendJson(
        res,
        200,
        fields.length
          ? fields
          : [
              { id: 'f_name', label: 'Nome Completo', type: 'TEXT', required: true, system_key: 'name' },
              { id: 'f_phone', label: 'WhatsApp', type: 'PHONE', required: true, system_key: 'phone' },
              { id: 'f_email', label: 'E-mail', type: 'EMAIL', required: false, system_key: 'email' },
            ]
      );
    }
    if (action === 'registrations' && req.method === 'POST') {
      const body = await readBody(req);
      const ans = body.data || {};
      const insc = {
        id: crypto.randomUUID(),
        church_id: MSU_ID,
        evento_id: evId,
        origem: 'TAG',
        participant_name: Object.values(ans)[0] || 'Participante TAG',
        participant_phone: Object.values(ans)[1] || '',
        participant_email: Object.values(ans)[2] || '',
        custom_answers: ans,
        status: 'CONFIRMADA',
        valor_centavos: 0,
        pago_em: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      db.tables.inscricao.unshift(insc);
      persistDb();
      return sendJson(res, 200, { ok: true, id: insc.id, requires_payment: false });
    }
  }

  if (pathname === '/api/bible') {
    const book = searchParams.get('book') || 'JHN';
    const chapter = Number(searchParams.get('chapter') || 1);
    return sendJson(res, 200, {
      book,
      chapter,
      verses: BIBLE_VERSES.default,
    });
  }

  // 17. Loja TAG APIs (/api/frete, /api/cupom, /api/pedido)
  if (pathname === '/api/frete') {
    return sendJson(res, 200, { centavos: 2490, prazoDias: 5 });
  }
  if (pathname === '/api/cupom') {
    return sendJson(res, 200, { descontoCentavos: 2500 });
  }
  if (pathname === '/api/pedido' && req.method === 'POST') {
    const body = await readBody(req);
    const id = crypto.randomUUID();
    const checkoutId = `chk_${Date.now()}`;
    db.tables.loja_pedido.unshift({
      id,
      checkout_id: checkoutId,
      status: 'PAGO',
      etapa_producao: 'ARTE',
      total_centavos: 89000,
      comprador_nome: body.nome || 'Claudemir Silva',
      comprador_email: body.email || 'calfatec@gmail.com',
      comprador_telefone: body.telefone || '14981447428',
      comprador_cpf_cnpj: body.cpfCnpj || '46.328.262/0001-80',
      igreja_nome: body.nomeIgreja || 'Ministério Somos Um',
      endereco_cep: body.cep || '18600-000',
      endereco_logradouro: body.logradouro || 'Avenida Brasil',
      endereco_numero: body.numero || '170',
      endereco_bairro: body.bairro || 'Centro',
      endereco_cidade: body.cidade || 'Botucatu',
      endereco_uf: body.uf || 'SP',
      church_id: MSU_ID,
      provisionado_em: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
    persistDb();
    return sendJson(res, 200, {
      id,
      checkoutId,
      link: '/loja?pedido=confirmado',
      totalCentavos: 89000,
    });
  }

  // Default fallback for any other /api/* action (e.g., /api/users/senha, /api/lp-purge, /api/suporte/igreja, /api/financeiro/*)
  return sendJson(res, 200, { ok: true, status: 'ok' });
}

// Serve static file helper
function serveFile(res, filePath, contentTypeOverride = null) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;
  const ext = path.extname(filePath).toLowerCase();
  const contentType = contentTypeOverride || MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    'Access-Control-Allow-Origin': '*',
  });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

// Map route pathname to the exact extracted HTML shell
function resolvePanelHtmlFile(pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/dashboard';

  if (clean === '/' || clean === '/dashboard') return path.join(PAGES_DIR, 'dashboard.html');

  // Direct match e.g. /financas/entradas -> financas__entradas.html
  const directName = clean.slice(1).replace(/\//g, '__') + '.html';
  const directPath = path.join(PAGES_DIR, directName);
  if (fs.existsSync(directPath)) return directPath;

  // Dynamic routes
  if (/^\/academy\/[^/]+\/aulas\/[^/]+$/.test(clean)) {
    return path.join(PAGES_DIR, 'academy__1__aulas__1.html');
  }
  if (/^\/academy\/[^/]+$/.test(clean)) {
    return path.join(PAGES_DIR, 'academy__1.html');
  }
  if (/^\/admin\/igrejas\/[^/]+$/.test(clean)) {
    return path.join(PAGES_DIR, 'admin__igrejas__1.html');
  }
  if (/^\/admin\/academy\/cursos\/[^/]+$/.test(clean)) {
    return path.join(PAGES_DIR, 'admin__academy__cursos__1.html');
  }
  if (/^\/pastoral\/pessoa\/[^/]+$/.test(clean)) {
    return path.join(PAGES_DIR, 'pastoral__pessoa__1.html');
  }
  if (/^\/social\/beneficiarios\/[^/]+$/.test(clean)) {
    return path.join(PAGES_DIR, 'social__beneficiarios__1.html');
  }
  if (/^\/social\/solicitacoes\/[^/]+$/.test(clean)) {
    return path.join(PAGES_DIR, 'social__solicitacoes__1.html');
  }

  return null;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      return sendJson(res, 200, {});
    }

    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(parsedUrl.pathname);
    const searchParams = parsedUrl.searchParams;

    // Healthcheck for Render
    if (pathname === '/healthz' || pathname === '/api/health') {
      return sendJson(res, 200, { status: 'ok', system: 'SomosSistem', church: 'Ministério Somos Um' });
    }

    // 1. Supabase Local Gateway (/supabase/*)
    if (pathname.startsWith('/supabase/')) {
      const subPath = pathname.slice('/supabase'.length);

      // Auth endpoints
      if (subPath.startsWith('/auth/v1/token')) {
        const body = await readBody(req);
        return sendJson(res, 200, buildJwtSession(body.email || 'calfatec@gmail.com'));
      }
      if (subPath.startsWith('/auth/v1/user')) {
        return sendJson(res, 200, buildJwtSession().user);
      }
      if (subPath.startsWith('/auth/v1/logout')) {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
        return res.end();
      }
      if (subPath.startsWith('/auth/v1/factors')) {
        return sendJson(res, 200, {
          id: 'factor-somossistem-totp-1',
          type: 'totp',
          totp: {
            qr_code: '/assets/simbolo-somos-um.png',
            secret: 'SOMOSSISTEMMSU2026',
            uri: 'otpauth://totp/SomosSistem:calfatec@gmail.com?secret=SOMOSSISTEMMSU2026&issuer=SomosSistem',
          },
        });
      }
      if (subPath.startsWith('/auth/v1/')) {
        return sendJson(res, 200, { ok: true });
      }

      // Storage endpoints
      if (subPath.startsWith('/storage/v1/')) {
        if (req.method === 'GET') {
          if (subPath.includes('1789845621625-2vmqexulbxl.jpg')) {
            return serveFile(res, path.join(PUBLIC_DIR, 'assets', 'claudemir-photo.jpg'));
          }
          if (subPath.includes('splash')) {
            return serveFile(res, path.join(PUBLIC_DIR, 'assets', 'logo-somos-um.png'));
          }
          return serveFile(res, path.join(PUBLIC_DIR, 'assets', 'simbolo-somos-um.png'));
        }
        return sendJson(res, 200, { Key: 'branding/uploaded.png', Id: crypto.randomUUID() });
      }

      // PostgREST RPC endpoints
      if (subPath.startsWith('/rest/v1/rpc/')) {
        const rpcName = subPath.slice('/rest/v1/rpc/'.length);
        return handleRpc(req, res, rpcName);
      }

      // PostgREST Table endpoints
      if (subPath.startsWith('/rest/v1/')) {
        const table = subPath.slice('/rest/v1/'.length).replace(/\/+$/, '');
        return handleRestTable(req, res, table, searchParams);
      }
    }

    // 2. Internal API endpoints (/api/*)
    if (pathname.startsWith('/api/')) {
      return handleApi(req, res, pathname, searchParams);
    }

    // 3. Static files in public/ (_next/static/*, assets/*, catalogo/*, icon.svg, etc.)
    const staticCandidate = path.join(PUBLIC_DIR, pathname);
    if (staticCandidate.startsWith(PUBLIC_DIR) && serveFile(res, staticCandidate)) {
      return;
    }

    // 4. TAG Public NFC / QR Application (/tag, /tag/home, /home)
    if (pathname === '/tag' || pathname === '/tag/' || pathname === '/tag/home/redirect') {
      const ch = searchParams.get('church') || 'msu';
      res.writeHead(302, { Location: `/home?church=${encodeURIComponent(ch)}` });
      return res.end();
    }
    if (pathname === '/tag/home' || pathname === '/home') {
      if (!searchParams.has('church')) {
        res.writeHead(302, { Location: `/home?church=msu` });
        return res.end();
      }
      return serveFile(res, path.join(TAG_PAGES_DIR, 'home.html'));
    }

    // 5. Loja TAG Application (/loja, /catalogo, /carrinho, /checkout, /produto/:id)
    if (pathname === '/loja' || pathname === '/loja/') {
      return serveFile(res, path.join(LOJA_PAGES_DIR, 'loja.html'));
    }
    if (pathname === '/catalogo' || pathname === '/loja/catalogo') {
      return serveFile(res, path.join(LOJA_PAGES_DIR, 'catalogo.html'));
    }
    if (pathname === '/carrinho' || pathname === '/loja/carrinho') {
      return serveFile(res, path.join(LOJA_PAGES_DIR, 'carrinho.html'));
    }
    if (pathname === '/checkout' || pathname === '/loja/checkout') {
      return serveFile(res, path.join(LOJA_PAGES_DIR, 'checkout.html'));
    }
    if (pathname.startsWith('/produto/') || pathname.startsWith('/loja/produto/')) {
      const prodId = pathname.split('/').pop();
      const prodFile = path.join(LOJA_PAGES_DIR, `produto__${prodId}.html`);
      if (serveFile(res, prodFile)) return;
      return serveFile(res, path.join(LOJA_PAGES_DIR, 'produto__placa.html'));
    }

    // 6. Portal Integrado Comunidade & Voluntários (/site, /voluntarios, /comunidade)
    if (
      pathname === '/site' ||
      pathname === '/site/' ||
      pathname === '/voluntarios' ||
      pathname === '/voluntarios/' ||
      pathname === '/comunidade' ||
      pathname === '/comunidade/'
    ) {
      return serveFile(res, path.join(PAGES_DIR, 'landing.html'));
    }

    // 7. Panel Routes (all 58 static & dynamic routes)
    const htmlFile = resolvePanelHtmlFile(pathname);
    if (htmlFile && serveFile(res, htmlFile)) {
      return;
    }

    // Fallback to dashboard.html
    return serveFile(res, path.join(PAGES_DIR, 'dashboard.html'));
  } catch (err) {
    console.error('Server error:', err);
    return sendJson(res, 500, { error: 'Erro interno no servidor SomosSistem' });
  }
});

const PORT = Number(process.env.PORT || 3000);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`SomosSistem Server rodando em http://localhost:${PORT}`);
});
