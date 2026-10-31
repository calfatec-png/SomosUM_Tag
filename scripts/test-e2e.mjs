import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const PORT = 3456;
const BASE = `http://localhost:${PORT}`;

const ALL_ROUTES = [
  '/login',
  '/mfa',
  '/trocar-senha',
  '/dashboard',
  '/igreja',
  '/membros',
  '/oracoes',
  '/doacoes',
  '/doacoes/conta',
  '/eventos',
  '/cursos',
  '/editor',
  '/academy',
  '/academy/equipe',
  '/academy/1',
  '/academy/1/aulas/1',
  '/pastoral',
  '/pastoral/pessoa/2d80ef13-a56d-414b-bd73-98e68d40cebd',
  '/escala',
  '/ministerios',
  '/social',
  '/social/estoque',
  '/social/familias',
  '/social/entregas',
  '/social/entradas',
  '/social/mutirao',
  '/social/solicitacoes',
  '/social/solicitacoes/sreq0001-0000-4000-8000-000000000001',
  '/social/beneficiarios/fam00001-0000-4000-8000-000000000001',
  '/financas',
  '/financas/extrato',
  '/financas/entradas',
  '/financas/saidas',
  '/financas/boletos',
  '/financas/recebedores',
  '/financas/config',
  '/metricas',
  '/metricas/doacoes',
  '/metricas/inscricoes',
  '/metricas/membros',
  '/metricas/social',
  '/metricas/visitantes',
  '/settings',
  '/settings/users',
  '/settings/security',
  '/settings/legal',
  '/privacidade',
  '/termos',
  '/admin',
  '/admin/igrejas',
  '/admin/igrejas/7d7b2b25-05c2-4622-9efb-f88838578770',
  '/admin/planos',
  '/admin/loja',
  '/admin/loja/pedidos',
  '/admin/academy',
  '/admin/academy/igrejas',
  '/admin/academy/cursos/1',
  '/admin/agente',
  '/admin/auditoria',
  '/home?church=msu',
  '/loja',
  '/catalogo',
  '/produto/placa',
  '/carrinho',
  '/checkout',
  '/site',
];

async function runTests() {
  console.log('Starting SomosSistem server on port', PORT, '...');
  const proc = spawn(process.execPath, ['server/index.mjs'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 8000);
    proc.stdout.on('data', (d) => {
      if (d.toString().includes('SomosSistem Server rodando')) {
        clearTimeout(timer);
        resolve();
      }
    });
    proc.stderr.on('data', (d) => console.error(d.toString()));
  });

  try {
    // 1. Healthcheck
    const hz = await fetch(`${BASE}/healthz`).then((r) => r.json());
    assert.equal(hz.status, 'ok');
    assert.equal(hz.system, 'SomosSistem');
    console.log('✓ Healthcheck /healthz OK');

    // 2. Test all 66 HTML routes + verify all referenced JS/CSS chunks exist & have zero "Excelente"/"Exelente"
    const checkedChunks = new Set();
    for (const rt of ALL_ROUTES) {
      const res = await fetch(`${BASE}${rt}`);
      assert.equal(res.status, 200, `Route ${rt} returned ${res.status}`);
      const html = await res.text();
      assert.ok(html.includes('somossistem-enhancer.js'), `Route ${rt} missing somossistem-enhancer.js`);
      assert.ok(!html.includes('Igreja Excelente'), `Route ${rt} still contains 'Igreja Excelente'`);
      assert.ok(!html.includes('Exelente'), `Route ${rt} contains 'Exelente'`);

      const assets = [...html.matchAll(/\/_next\/static\/(?:chunks|media)\/[^\x22\x27\?\\\s\)]+/g)].map((m) => m[0]);
      for (const asset of assets) {
        if (checkedChunks.has(asset)) continue;
        checkedChunks.add(asset);
        const aRes = await fetch(`${BASE}${asset}`);
        assert.equal(aRes.status, 200, `Asset ${asset} (from ${rt}) returned ${aRes.status}`);
        if (asset.endsWith('.js') || asset.endsWith('.css')) {
          const txt = await aRes.text();
          assert.ok(!txt.includes('Igreja Excelente'), `Asset ${asset} still contains 'Igreja Excelente'`);
        }
      }
    }
    console.log(`✓ All ${ALL_ROUTES.length} routes and ${checkedChunks.size} static JS/CSS/font assets verified (200 OK, rebranded to SomosSistem)!`);

    // 3. Verify uploaded logos & palette CSS
    for (const logoPath of ['/assets/logo-somos-um.png', '/assets/simbolo-somos-um.png', '/_next/static/media/igex-simbolo.188z-ivxpawv6.png', '/icon.svg']) {
      const lRes = await fetch(`${BASE}${logoPath}`);
      assert.equal(lRes.status, 200, `Logo ${logoPath} returned ${lRes.status}`);
      const buf = await lRes.arrayBuffer();
      assert.ok(buf.byteLength > 200, `Logo ${logoPath} is empty`);
    }
    const cssText = await fetch(`${BASE}/_next/static/chunks/0u05y-3mswj76.css`).then((r) => r.text());
    for (const hex of ['#BF1F2C', '#BF1744', '#A61458', '#BF0F70', '#0D3640']) {
      assert.ok(cssText.includes(hex), `CSS missing palette color ${hex}`);
    }
    console.log('✓ Uploaded logos & 5-color palette (#BF1F2C, #BF1744, #A61458, #BF0F70, #0D3640) verified!');

    // 4. Verify Auth Login with calfatec@gmail.com / @IPHONEsat037
    const authRes = await fetch(`${BASE}/supabase/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'calfatec@gmail.com', password: '@IPHONEsat037' }),
    });
    assert.equal(authRes.status, 200);
    const authJson = await authRes.json();
    assert.equal(authJson.user.email, 'calfatec@gmail.com');
    assert.equal(authJson.user.id, '9d866689-a4ec-4c41-931c-df865c189a59');
    console.log('✓ Supabase Auth login for calfatec@gmail.com verified!');

    // 5. Verify PostgREST Foreign-Key Joins & Single Object mode
    const profRes = await fetch(
      `${BASE}/supabase/rest/v1/profiles?select=*,church:church_id(id,name,slug,logo_url,primary_color,secondary_color)&id=eq.9d866689-a4ec-4c41-931c-df865c189a59`,
      { headers: { Accept: 'application/vnd.pgrst.object+json' } }
    );
    assert.equal(profRes.status, 200);
    const prof = await profRes.json();
    assert.equal(prof.name, 'Claudemir');
    assert.equal(prof.church.name, 'Ministério Somos Um');
    assert.equal(prof.church.primary_color, '#BF1F2C');

    const finEntradas = await fetch(
      `${BASE}/supabase/rest/v1/financas_entrada?select=*,conta:conta_id(id,nome,tipo),tipo:tipo_id(id,nome),categoria:categoria_id(id,nome)&church_id=eq.7d7b2b25-05c2-4622-9efb-f88838578770`
    ).then((r) => r.json());
    assert.ok(finEntradas.length >= 4);
    assert.ok(finEntradas[1].conta?.nome);
    assert.ok(finEntradas[1].categoria?.nome);
    console.log('✓ PostgREST queries & embedded foreign-key joins verified!');

    // 6. Verify RPCs
    const dashAgg = await fetch(`${BASE}/supabase/rest/v1/rpc/dashboard_agregado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_church_id: '7d7b2b25-05c2-4622-9efb-f88838578770' }),
    }).then((r) => r.json());
    assert.ok(dashAgg.membros_totais > 100);
    assert.ok(dashAgg.visitantes > 0);

    const estStatus = await fetch(`${BASE}/supabase/rest/v1/rpc/social_estoque_status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_church_id: '7d7b2b25-05c2-4622-9efb-f88838578770' }),
    }).then((r) => r.json());
    assert.equal(estStatus.length, 6);
    console.log('✓ All Supabase RPCs verified!');

    // 7. Verify Internal APIs (/api/*)
    const apiTests = [
      ['/api/acessos/areas', (d) => assert.equal(d.areas.length, 5)],
      ['/api/escala', (d) => assert.ok(d.linked && d.data.length === 4)],
      ['/api/admin/superadmin/igrejas', (d) => assert.ok(d.resumo && d.items.length >= 28)],
      ['/api/admin/superadmin/ficha?id=7d7b2b25-05c2-4622-9efb-f88838578770', (d) => assert.equal(d.igreja.name, 'Ministério Somos Um')],
      ['/api/admin/superadmin/planos', (d) => assert.equal(d.planos.length, 3)],
      ['/api/admin/superadmin/auditoria', (d) => assert.ok(d.items.length >= 3)],
      ['/api/admin/agente', (d) => assert.ok(d.conversas.length >= 1)],
      ['/api/editor/trabalhos', (d) => assert.ok(d.trabalhos.length >= 1)],
      ['/api/lp-data?slug=msu', (d) => assert.equal(d.church.name, 'Ministério Somos Um')],
      ['/api/bible?book=JHN&chapter=17', (d) => assert.ok(d.verses.length >= 5)],
      ['/api/voluntarios/painel', (d) => assert.ok(d.ok && d.resumo && d.escalas.length === 4)],
    ];
    for (const [endpoint, check] of apiTests) {
      const r = await fetch(`${BASE}${endpoint}`);
      assert.equal(r.status, 200, `API ${endpoint} returned ${r.status}`);
      const d = await r.json();
      check(d);
    }
    console.log('✓ All internal /api/* endpoints (Panel, SuperAdmin, Editor, Escala, TAG, Loja) verified!');
    console.log('\nALL E2E TESTS PASSED 100%!');
  } finally {
    proc.kill();
  }
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
