import fs from 'node:fs';
import path from 'node:path';

const SCRATCH = 'C:/Users/calfa/.gemini/antigravity/brain/4d14607f-9038-4183-bfdb-b34dc1bae4c7/scratch';
const MSU_PATH = path.join(SCRATCH, 'igex_dump', 'msu_full_data.json');
const DATA_DIR = path.join(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

if (!fs.existsSync(MSU_PATH)) {
  console.log('Pre-built data/seed.json is already present. Skipping local scratch seed build.');
  process.exit(0);
}

const msu = JSON.parse(fs.readFileSync(MSU_PATH, 'utf8'));
const MSU_ID = '7d7b2b25-05c2-4622-9efb-f88838578770';
const AVARE_ID = '82b2106d-37a9-4039-a7e2-590775a863b7';
const CLAUDEMIR_ID = '9d866689-a4ec-4c41-931c-df865c189a59';

const tables = { ...msu.tables };

// Ensure all 14 modules exist in `module`
const allModuleDefs = [
  { key: 'tag', name: 'TAG', description: 'Página NFC e QR Code', sort_order: 1 },
  { key: 'metricas', name: 'Métricas', description: 'Analítico completo', sort_order: 2 },
  { key: 'galeria', name: 'Galeria', description: 'Galeria e mídia', sort_order: 3 },
  { key: 'forms', name: 'Formulários', description: 'Formulários de captação', sort_order: 4 },
  { key: 'pastoral', name: 'Pastoral', description: 'Cuidado pastoral e ovelhas', sort_order: 5 },
  { key: 'financas', name: 'Finanças', description: 'Gestão financeira e conciliação', sort_order: 6 },
  { key: 'social', name: 'Social', description: 'Ação social, estoque e famílias', sort_order: 7 },
  { key: 'escala', name: 'Escalas', description: 'Escalas de voluntários e cultos', sort_order: 8 },
  { key: 'editor', name: 'Editor SomosSistem', description: 'Edição automática de vídeos', sort_order: 9 },
  { key: 'academy', name: 'SomosSistem Academy', description: 'Formação e treinamento da equipe', sort_order: 10 },
  { key: 'ministerios', name: 'Ministérios', description: 'Gestão de ministérios e líderes', sort_order: 11 },
  { key: 'comunicacao', name: 'Comunicação', description: 'Comunicação integrada', sort_order: 12 },
  { key: 'devocional', name: 'Devocional', description: 'Devocional diário', sort_order: 13 },
  { key: 'kids', name: 'Kids', description: 'Ministério infantil', sort_order: 14 },
];
tables.module = allModuleDefs;

// Enable all modules for Ministério Somos Um and Ministério Somos Um Avaré
const existingModules = tables.church_module || [];
const msuModules = new Set(existingModules.filter(m => m.church_id === MSU_ID).map(m => m.module_key));
for (const mod of allModuleDefs) {
  if (!msuModules.has(mod.key)) {
    existingModules.push({
      church_id: MSU_ID,
      module_key: mod.key,
      enabled: true,
      created_at: '2026-07-20T01:51:58.254171+00:00'
    });
  } else {
    const entry = existingModules.find(m => m.church_id === MSU_ID && m.module_key === mod.key);
    if (entry) entry.enabled = true;
  }
}
tables.church_module = existingModules;

// Update Ministério Somos Um church branding with the uploaded logos and 5-color palette
tables.church = (tables.church || []).map(c => {
  if (c.id === MSU_ID) {
    return {
      ...c,
      name: 'Ministério Somos Um',
      slug: 'msu',
      primary_color: '#BF1F2C',
      secondary_color: '#0D3640',
      logo_url: '/assets/simbolo-somos-um.png',
      splash_url: '/assets/logo-somos-um.png',
      icon_url: '/assets/simbolo-somos-um.png',
      plano: 'completo',
      cidade: 'Botucatu · SP',
      cnpj: '46.328.262/0001-80',
    };
  }
  if (c.id === AVARE_ID) {
    return {
      ...c,
      primary_color: '#BF1F2C',
      secondary_color: '#0D3640',
      logo_url: '/assets/simbolo-somos-um.png',
      plano: 'completo',
      cidade: 'Avaré · SP',
      cnpj: '46.328.262/0002-61',
    };
  }
  return {
    ...c,
    plano: c.plano || 'essencial',
    cidade: c.pix_merchant_city || 'São Paulo · SP',
  };
});

// Update Claudemir's photo URL to local asset
tables.profiles = (tables.profiles || []).map(p => {
  if (p.id === CLAUDEMIR_ID) {
    return {
      ...p,
      photo_url: '/assets/claudemir-photo.jpg',
      photo_path: '/assets/claudemir-photo.jpg',
    };
  }
  return p;
});

// Update church_lp to have all sections visible and rich data
tables.church_lp = (tables.church_lp || []).map(lp => {
  if (lp.church_id === MSU_ID) {
    return {
      ...lp,
      background_color: '#0D3640',
      service_hours: [
        { name: 'Quarta que Fortalece', day: 'Quarta-feira', time: '19:30' },
        { name: 'Culto da Família', day: 'Domingo', time: '18:30' },
        { name: 'Arena Jovem Somos Um', day: 'Sábado', time: '19:30' }
      ],
      pagina: (lp.pagina || []).map(s => ({ ...s, visivel: true })),
    };
  }
  return lp;
});

// Add additional groups in church_lp_grupo
tables.church_lp_grupo = [
  ...(tables.church_lp_grupo || []),
  {
    id: '85909eb9-2b73-41ca-ac8b-6741af3c7ff1',
    church_id: MSU_ID,
    nome: 'Somos Um Jovens · Botucatu',
    descricao: 'Comunhão, palavra e discipulado para jovens e universitários.',
    dia: 'Sábado',
    horario: '19:30',
    local: 'Avenida Brasil, 170 · Botucatu',
    lider: 'Pr. André Ribeiro',
    whatsapp: '5514998568857',
    emoji: '🔥',
    ordem: 2,
    created_at: '2026-09-20T19:10:10.77162+00:00',
    updated_at: '2026-09-20T19:10:10.77162+00:00'
  },
  {
    id: '85909eb9-2b73-41ca-ac8b-6741af3c7ff2',
    church_id: MSU_ID,
    nome: 'Casais em Aliança',
    descricao: 'Edificando famílias fortes sobre a Rocha.',
    dia: 'Terça',
    horario: '20:00',
    local: 'Salão Comunhão · Ministério Somos Um',
    lider: 'Claudemir & Esposa',
    whatsapp: '5514981447428',
    emoji: '❤️',
    ordem: 3,
    created_at: '2026-09-21T19:10:10.77162+00:00',
    updated_at: '2026-09-21T19:10:10.77162+00:00'
  }
];

// Enrich Doações
tables.doacao = [
  ...(tables.doacao || []),
  {
    id: 'd0000001-0000-4000-8000-000000000001',
    church_id: MSU_ID,
    profile_id: CLAUDEMIR_ID,
    valor: 450.00,
    tipo: 'DIZIMO',
    origem: 'TAG',
    idfatura: 'fat_somos_001',
    created_at: '2026-10-05T14:20:00+00:00',
    culto_ocorrencia_id: null,
    nome_pessoa: 'Claudemir Silva',
    donor_name: 'Claudemir Silva',
    donor_email: 'calfatec@gmail.com'
  },
  {
    id: 'd0000001-0000-4000-8000-000000000002',
    church_id: MSU_ID,
    profile_id: '2d80ef13-a56d-414b-bd73-98e68d40cebd',
    valor: 180.00,
    tipo: 'OFERTA',
    origem: 'TAG',
    idfatura: 'fat_somos_002',
    created_at: '2026-10-12T20:15:00+00:00',
    culto_ocorrencia_id: null,
    nome_pessoa: 'Sunamita Martins',
    donor_name: 'Sunamita Martins',
    donor_email: 'sunamita-acd@hotmail.com'
  },
  {
    id: 'd0000001-0000-4000-8000-000000000003',
    church_id: MSU_ID,
    profile_id: '5c42c6ae-7d4d-4107-9c8d-3805bccebbfc',
    valor: 320.00,
    tipo: 'DIZIMO',
    origem: 'APP',
    idfatura: 'fat_somos_003',
    created_at: '2026-10-18T11:30:00+00:00',
    culto_ocorrencia_id: null,
    nome_pessoa: 'Ricardo Colauto',
    donor_name: 'Ricardo Colauto',
    donor_email: 'ricardocolauto8@gmail.com'
  }
];

// Enrich Finanças (Contas, Recebedores, Entradas, Saídas, Boletos Fixos, Extrato)
const CONTA_CAIXA_ID = '86adf429-1f45-45dc-8f12-03db734e7962';
const CONTA_BANCO_ID = '86adf429-1f45-45dc-8f12-03db734e7963';
tables.financas_conta = [
  {
    id: CONTA_CAIXA_ID,
    church_id: MSU_ID,
    nome: 'Conta Corrente Principal · Banco Cora',
    tipo: 'CONTA_BANCARIA',
    saldo_inicial: 14500,
    moeda_secundaria: false,
    saldo_inicial_usd: 0,
    ordem: 1,
    archived_at: null,
    created_at: '2026-07-20T01:51:58.254171+00:00',
    updated_at: '2026-10-20T01:51:58.254171+00:00'
  },
  {
    id: CONTA_BANCO_ID,
    church_id: MSU_ID,
    nome: 'Fundo Missões & Social · Somos Um',
    tipo: 'CONTA_BANCARIA',
    saldo_inicial: 6200,
    moeda_secundaria: false,
    saldo_inicial_usd: 0,
    ordem: 2,
    archived_at: null,
    created_at: '2026-08-01T10:00:00+00:00',
    updated_at: '2026-10-20T10:00:00+00:00'
  }
];

const RECEBEDOR_CPFL = 'rec00001-0000-4000-8000-000000000001';
const RECEBEDOR_SABESP = 'rec00001-0000-4000-8000-000000000002';
const RECEBEDOR_SOM = 'rec00001-0000-4000-8000-000000000003';
tables.financas_recebedor = [
  { id: RECEBEDOR_CPFL, church_id: MSU_ID, nome: 'CPFL Energia Botucatu', documento: '02.328.280/0001-97', chave_pix: 'financeiro@cpfl.com.br', observacoes: 'Energia elétrica do templo sede', archived_at: null, created_at: '2026-08-01T12:00:00Z', updated_at: '2026-08-01T12:00:00Z' },
  { id: RECEBEDOR_SABESP, church_id: MSU_ID, nome: 'Sabesp Saneamento', documento: '43.776.517/0001-80', chave_pix: null, observacoes: 'Água e esgoto Avenida Brasil 170', archived_at: null, created_at: '2026-08-01T12:00:00Z', updated_at: '2026-08-01T12:00:00Z' },
  { id: RECEBEDOR_SOM, church_id: MSU_ID, nome: 'ProAudio Equipamentos & Luz', documento: '18.441.990/0001-11', chave_pix: '18441990000111', observacoes: 'Manutenção de som e projeção', archived_at: null, created_at: '2026-08-10T12:00:00Z', updated_at: '2026-08-10T12:00:00Z' }
];

tables.financas_boleto_fixo = [
  { id: 'bol00001-0000-4000-8000-000000000001', church_id: MSU_ID, nome: 'Aluguel e Condomínio Templo', recebedor_id: null, departamento_id: 'b79ca99c-cd00-4539-9623-bedf50123068', subcategoria_id: '2f797541-6c58-4e95-86a9-c7544073f9e1', conta_id: CONTA_CAIXA_ID, forma_pagamento_id: '71ad9f1d-6e82-4c22-8ca5-8adf558171e6', valor_estimado: 3500.00, moeda: 'BRL', dia_vencimento: 10, ativo: true, observacoes: 'Vencimento todo dia 10', created_at: '2026-08-01T12:00:00Z', updated_at: '2026-08-01T12:00:00Z' },
  { id: 'bol00001-0000-4000-8000-000000000002', church_id: MSU_ID, nome: 'Energia Elétrica CPFL', recebedor_id: RECEBEDOR_CPFL, departamento_id: 'b79ca99c-cd00-4539-9623-bedf50123068', subcategoria_id: null, conta_id: CONTA_CAIXA_ID, forma_pagamento_id: '5b653131-051a-4cef-b396-7c5cba2f608c', valor_estimado: 680.00, moeda: 'BRL', dia_vencimento: 15, ativo: true, observacoes: 'Débito automático / Pix', created_at: '2026-08-01T12:00:00Z', updated_at: '2026-08-01T12:00:00Z' },
  { id: 'bol00001-0000-4000-8000-000000000003', church_id: MSU_ID, nome: 'Internet Fibra 1Gbps Templo', recebedor_id: null, departamento_id: 'db3e8529-8ea0-4fad-9235-d55ec2d8a542', subcategoria_id: null, conta_id: CONTA_CAIXA_ID, forma_pagamento_id: '71ad9f1d-6e82-4c22-8ca5-8adf558171e6', valor_estimado: 199.90, moeda: 'BRL', dia_vencimento: 20, ativo: true, observacoes: 'Link dedicado transmissão ao vivo', created_at: '2026-08-01T12:00:00Z', updated_at: '2026-08-01T12:00:00Z' }
];

tables.financas_entrada = [
  ...(tables.financas_entrada || []),
  {
    id: 'ent00001-0000-4000-8000-000000000001',
    church_id: MSU_ID,
    conta_id: CONTA_CAIXA_ID,
    tipo_id: '39228cfd-a951-4b68-adea-abbde1481ff7', // Pix
    categoria_id: '447745e7-14b3-489d-9363-4b2b31328814', // Dízimos
    descricao: 'Dízimos Culto da Família · 1º Domingo',
    valor: 4850.00,
    moeda: 'BRL',
    data: '2026-10-04',
    conferido: true,
    comprovante_path: null,
    cancelado_em: null,
    cancelado_por: null,
    cancelado_motivo: null,
    created_by: CLAUDEMIR_ID,
    created_at: '2026-10-04T21:30:00Z',
    updated_at: '2026-10-04T21:30:00Z',
    ref_externa: null
  },
  {
    id: 'ent00001-0000-4000-8000-000000000002',
    church_id: MSU_ID,
    conta_id: CONTA_CAIXA_ID,
    tipo_id: '0830e57d-07de-412a-9c80-72926fbdd6c1', // Dinheiro
    categoria_id: 'bfe91b32-c9ec-42e6-a330-cd62cb17d031', // Ofertas
    descricao: 'Ofertas Quarta que Fortalece',
    valor: 1290.50,
    moeda: 'BRL',
    data: '2026-10-07',
    conferido: true,
    comprovante_path: null,
    cancelado_em: null,
    cancelado_por: null,
    cancelado_motivo: null,
    created_by: CLAUDEMIR_ID,
    created_at: '2026-10-07T22:00:00Z',
    updated_at: '2026-10-07T22:00:00Z',
    ref_externa: null
  },
  {
    id: 'ent00001-0000-4000-8000-000000000003',
    church_id: MSU_ID,
    conta_id: CONTA_BANCO_ID,
    tipo_id: '39228cfd-a951-4b68-adea-abbde1481ff7', // Pix
    categoria_id: 'c01ecfe8-8ac4-49b9-a72d-9acfe03e9206', // Campanhas
    descricao: 'Campanha Fé com Pão · Ação Social Somos Um',
    valor: 2450.00,
    moeda: 'BRL',
    data: '2026-10-14',
    conferido: true,
    comprovante_path: null,
    cancelado_em: null,
    cancelado_por: null,
    cancelado_motivo: null,
    created_by: CLAUDEMIR_ID,
    created_at: '2026-10-14T18:00:00Z',
    updated_at: '2026-10-14T18:00:00Z',
    ref_externa: null
  },
  {
    id: 'ent00001-0000-4000-8000-000000000004',
    church_id: MSU_ID,
    conta_id: CONTA_CAIXA_ID,
    tipo_id: '39228cfd-a951-4b68-adea-abbde1481ff7', // Pix
    categoria_id: '447745e7-14b3-489d-9363-4b2b31328814', // Dízimos
    descricao: 'Dízimos e Ofertas via TAG NFC · 3º Domingo',
    valor: 5620.00,
    moeda: 'BRL',
    data: '2026-10-18',
    conferido: true,
    comprovante_path: null,
    cancelado_em: null,
    cancelado_por: null,
    cancelado_motivo: null,
    created_by: CLAUDEMIR_ID,
    created_at: '2026-10-18T21:15:00Z',
    updated_at: '2026-10-18T21:15:00Z',
    ref_externa: null
  }
];

tables.financas_saida = [
  ...(tables.financas_saida || []),
  {
    id: 'sai00001-0000-4000-8000-000000000001',
    church_id: MSU_ID,
    conta_id: CONTA_CAIXA_ID,
    forma_pagamento_id: '71ad9f1d-6e82-4c22-8ca5-8adf558171e6', // Boleto
    departamento_id: 'b79ca99c-cd00-4539-9623-bedf50123068', // Estrutura
    subcategoria_id: '2f797541-6c58-4e95-86a9-c7544073f9e1', // Aluguel
    recebedor_id: null,
    descricao: 'Aluguel e manutenção Templo Sede Outubro/2026',
    valor: 3500.00,
    moeda: 'BRL',
    data_pagamento: '2026-10-10',
    data_vencimento: '2026-10-10',
    conferido: true,
    comprovante_path: null,
    boleto_fixo_id: 'bol00001-0000-4000-8000-000000000001',
    competencia: '2026-10',
    cancelado_em: null,
    cancelado_por: null,
    cancelado_motivo: null,
    created_by: CLAUDEMIR_ID,
    created_at: '2026-10-10T14:00:00Z',
    updated_at: '2026-10-10T14:00:00Z'
  },
  {
    id: 'sai00001-0000-4000-8000-000000000002',
    church_id: MSU_ID,
    conta_id: CONTA_CAIXA_ID,
    forma_pagamento_id: '5b653131-051a-4cef-b396-7c5cba2f608c', // Pix
    departamento_id: 'b79ca99c-cd00-4539-9623-bedf50123068', // Estrutura
    subcategoria_id: null,
    recebedor_id: RECEBEDOR_CPFL,
    descricao: 'Fatura Energia Elétrica CPFL Outubro/2026',
    valor: 642.80,
    moeda: 'BRL',
    data_pagamento: '2026-10-15',
    data_vencimento: '2026-10-15',
    conferido: true,
    comprovante_path: null,
    boleto_fixo_id: 'bol00001-0000-4000-8000-000000000002',
    competencia: '2026-10',
    cancelado_em: null,
    cancelado_por: null,
    cancelado_motivo: null,
    created_by: CLAUDEMIR_ID,
    created_at: '2026-10-15T10:30:00Z',
    updated_at: '2026-10-15T10:30:00Z'
  },
  {
    id: 'sai00001-0000-4000-8000-000000000003',
    church_id: MSU_ID,
    conta_id: CONTA_BANCO_ID,
    forma_pagamento_id: '5b653131-051a-4cef-b396-7c5cba2f608c', // Pix
    departamento_id: 'e3aaa1c7-ee7e-4c53-ad48-d9bddd514514', // Social
    subcategoria_id: null,
    recebedor_id: null,
    descricao: 'Aquisição de Cestas Básicas · Ministério Fé com Pão',
    valor: 1480.00,
    moeda: 'BRL',
    data_pagamento: '2026-10-17',
    data_vencimento: '2026-10-17',
    conferido: true,
    comprovante_path: null,
    boleto_fixo_id: null,
    competencia: '2026-10',
    cancelado_em: null,
    cancelado_por: null,
    cancelado_motivo: null,
    created_by: CLAUDEMIR_ID,
    created_at: '2026-10-17T16:20:00Z',
    updated_at: '2026-10-17T16:20:00Z'
  }
];

tables.financas_extrato_linha = [];

// Financeiro Conta Digital (Doações / Asaas)
tables.financeiro_conta = [
  {
    id: 'finc0001-0000-4000-8000-000000000001',
    church_id: MSU_ID,
    ambiente: 'PRODUCTION',
    status: 'ATIVA',
    onboarding_status: 'APROVADO',
    asaas_account_id: 'acc_somosum_msu_01',
    criada_no_asaas_em: '2026-08-01T10:00:00Z',
    limite_avaliacao_atingido_em: null,
    conta_bancaria_repasse_id: 'rep_somosum_01',
    dados_comerciais_status: 'APPROVED',
    conta_bancaria_status: 'APPROVED',
    dados_comerciais_confirmados_em: '2026-08-02T10:00:00Z',
    dados_cadastro: {
      cnpj: '46328262000180',
      razaoSocial: 'MINISTERIO SOMOS UM BOTUCATU',
      email: 'somosumbotucatu@gmail.com',
      telefone: '14998568857'
    }
  }
];
tables.financeiro_documento = [];
tables.financeiro_termo_aceite = [
  { id: 'termo001', church_id: MSU_ID, aceito_em: '2026-08-01T10:00:00Z', nome: 'Claudemir Silva' }
];

// Social Module (Estoque, Famílias, Cestas, Entregas, Recebimentos, Solicitações)
const ITEM_ARROZ = 'item0001-0000-4000-8000-000000000001';
const ITEM_FEIJAO = 'item0001-0000-4000-8000-000000000002';
const ITEM_OLEO = 'item0001-0000-4000-8000-000000000003';
const ITEM_ACUCAR = 'item0001-0000-4000-8000-000000000004';
const ITEM_MACARRAO = 'item0001-0000-4000-8000-000000000005';
const ITEM_LEITE = 'item0001-0000-4000-8000-000000000006';

tables.item = [
  { id: ITEM_ARROZ, church_id: MSU_ID, name: 'Arroz Agulhinha Tipo 1 (5kg)', category: 'Alimentos', unit: 'pct', quantity: 42, min_quantity: 15, peso: 5.0, created_at: '2026-08-01T10:00:00Z' },
  { id: ITEM_FEIJAO, church_id: MSU_ID, name: 'Feijão Carioca (1kg)', category: 'Alimentos', unit: 'pct', quantity: 68, min_quantity: 25, peso: 1.0, created_at: '2026-08-01T10:00:00Z' },
  { id: ITEM_OLEO, church_id: MSU_ID, name: 'Óleo de Soja (900ml)', category: 'Alimentos', unit: 'un', quantity: 54, min_quantity: 20, peso: 0.9, created_at: '2026-08-01T10:00:00Z' },
  { id: ITEM_ACUCAR, church_id: MSU_ID, name: 'Açúcar Refinado (1kg)', category: 'Alimentos', unit: 'pct', quantity: 38, min_quantity: 15, peso: 1.0, created_at: '2026-08-01T10:00:00Z' },
  { id: ITEM_MACARRAO, church_id: MSU_ID, name: 'Macarrão Espaguete (500g)', category: 'Alimentos', unit: 'pct', quantity: 75, min_quantity: 30, peso: 0.5, created_at: '2026-08-01T10:00:00Z' },
  { id: ITEM_LEITE, church_id: MSU_ID, name: 'Leite Integral UHT (1L)', category: 'Alimentos', unit: 'cx', quantity: 12, min_quantity: 20, peso: 1.0, created_at: '2026-08-01T10:00:00Z' }
];

const CESTA_PADRAO = 'cesta001-0000-4000-8000-000000000001';
tables.social_cesta = [
  { id: CESTA_PADRAO, church_id: MSU_ID, nome: 'Cesta Básica Completa · Fé com Pão', descricao: 'Cesta familiar mensal do Ministério Somos Um', ativa: true, created_at: '2026-08-01T10:00:00Z' }
];
tables.social_cesta_item = [
  { id: 'ci01', cesta_id: CESTA_PADRAO, item_id: ITEM_ARROZ, qty: 1 },
  { id: 'ci02', cesta_id: CESTA_PADRAO, item_id: ITEM_FEIJAO, qty: 2 },
  { id: 'ci03', cesta_id: CESTA_PADRAO, item_id: ITEM_OLEO, qty: 2 },
  { id: 'ci04', cesta_id: CESTA_PADRAO, item_id: ITEM_ACUCAR, qty: 1 },
  { id: 'ci05', cesta_id: CESTA_PADRAO, item_id: ITEM_MACARRAO, qty: 2 }
];

const FAM_1 = 'fam00001-0000-4000-8000-000000000001';
const FAM_2 = 'fam00001-0000-4000-8000-000000000002';
const FAM_3 = 'fam00001-0000-4000-8000-000000000003';
tables.beneficiary = [
  { id: FAM_1, church_id: MSU_ID, name: 'Maria Aparecida Ferreira', cpf: '284.910.448-12', phone: '14997112233', address: 'Rua das Acácias, 412 · Jardim Paraíso, Botucatu', family_size: 4, income_range: 'Até 1 salário mínimo', status: 'ATIVO', notes: 'Acompanhada pelo ministério Fé com Pão', archived_at: null, created_at: '2026-08-10T14:00:00Z' },
  { id: FAM_2, church_id: MSU_ID, name: 'José Carlos de Oliveira', cpf: '193.845.118-04', phone: '14996554411', address: 'Rua Major Matheus, 980 · Vila dos Lavradores, Botucatu', family_size: 5, income_range: 'Sem renda fixa', status: 'ATIVO', notes: 'Três crianças em idade escolar', archived_at: null, created_at: '2026-08-18T14:00:00Z' },
  { id: FAM_3, church_id: MSU_ID, name: 'Ana Paula Rodrigues', cpf: '349.112.888-50', phone: '14998223344', address: 'Av. Conde de Serra Negra, 215 · Botucatu', family_size: 3, income_range: 'Até 1 salário mínimo', status: 'ATIVO', notes: 'Membro recém-integrada à célula', archived_at: null, created_at: '2026-09-05T14:00:00Z' }
];

tables.social_familia_membro = [
  { id: 'fm01', church_id: MSU_ID, familia_id: FAM_1, nome: 'Lucas Ferreira', parentesco: 'Filho(a)', documento: null, nascimento: '2016-05-12', created_at: '2026-08-10T14:00:00Z' },
  { id: 'fm02', church_id: MSU_ID, familia_id: FAM_1, nome: 'Sofia Ferreira', parentesco: 'Filho(a)', documento: null, nascimento: '2019-11-03', created_at: '2026-08-10T14:00:00Z' },
  { id: 'fm03', church_id: MSU_ID, familia_id: FAM_2, nome: 'Helena de Oliveira', parentesco: 'Cônjuge', documento: null, nascimento: '1988-03-22', created_at: '2026-08-18T14:00:00Z' }
];

const REC_1 = 'recb0001-0000-4000-8000-000000000001';
tables.social_recebimento = [
  { id: REC_1, church_id: MSU_ID, origem: 'Campanha Domingo Solidário · Somos Um', observacao: 'Arrecadação nos cultos de domingo', registrado_por: CLAUDEMIR_ID, anulado_em: null, anulado_por: null, anulado_motivo: null, created_at: '2026-10-05T19:00:00Z' }
];
tables.social_recebimento_linha = [
  { id: 'rl01', recebimento_id: REC_1, item_id: ITEM_ARROZ, qty: 20 },
  { id: 'rl02', recebimento_id: REC_1, item_id: ITEM_FEIJAO, qty: 30 },
  { id: 'rl03', recebimento_id: REC_1, item_id: ITEM_OLEO, qty: 24 }
];

const ENT_1 = 'entr0001-0000-4000-8000-000000000001';
const ENT_2 = 'entr0001-0000-4000-8000-000000000002';
tables.social_entrega = [
  { id: ENT_1, church_id: MSU_ID, familia_id: FAM_1, observacao: 'Entrega mensal outubro', entregue_por: CLAUDEMIR_ID, anulada_em: null, anulada_por: null, anulada_motivo: null, created_at: '2026-10-10T15:00:00Z' },
  { id: ENT_2, church_id: MSU_ID, familia_id: FAM_2, observacao: 'Entrega mensal outubro + leite para as crianças', entregue_por: CLAUDEMIR_ID, anulada_em: null, anulada_por: null, anulada_motivo: null, created_at: '2026-10-12T16:30:00Z' }
];
tables.social_entrega_linha = [
  { id: 'el01', entrega_id: ENT_1, tipo: 'CESTA', cesta_id: CESTA_PADRAO, item_id: null, qty: 1 },
  { id: 'el02', entrega_id: ENT_2, tipo: 'CESTA', cesta_id: CESTA_PADRAO, item_id: null, qty: 1 },
  { id: 'el03', entrega_id: ENT_2, tipo: 'ITEM', cesta_id: null, item_id: ITEM_LEITE, qty: 4 }
];

tables.social_request = [
  { id: 'sreq0001-0000-4000-8000-000000000001', church_id: MSU_ID, beneficiary_id: FAM_3, responsavel_id: CLAUDEMIR_ID, tipo: 'CESTA_BASICA', urgencia: 'ALTA', status: 'PENDENTE', descricao: 'Solicitação de cesta básica para o mês corrente e visita domiciliar.', concluido_at: null, created_at: '2026-10-19T14:00:00Z', updated_at: '2026-10-19T14:00:00Z' },
  { id: 'sreq0001-0000-4000-8000-000000000002', church_id: MSU_ID, beneficiary_id: FAM_1, responsavel_id: CLAUDEMIR_ID, tipo: 'VESTUARIO', urgencia: 'MEDIA', status: 'CONCLUIDO', descricao: 'Agasalhos infantis entregues pelo ministério.', concluido_at: '2026-10-11T17:00:00Z', created_at: '2026-10-08T10:00:00Z', updated_at: '2026-10-11T17:00:00Z' }
];

// Pastoral Acompanhamentos
tables.pastoral_acompanhamento = [
  {
    id: 'pac00001-0000-4000-8000-000000000001',
    church_id: MSU_ID,
    profile_id: '2d80ef13-a56d-414b-bd73-98e68d40cebd', // Sunamita
    pastor_id: CLAUDEMIR_ID,
    motivo: 'Acompanhamento de integração ministerial e discipulado.',
    status: 'EM_ANDAMENTO',
    prioridade: 'MEDIA',
    proximo_passo: 'Encontro de líderes na próxima quinta-feira',
    created_at: '2026-10-02T14:00:00Z',
    updated_at: '2026-10-15T14:00:00Z'
  }
];

// Inscrições de Eventos
tables.inscricao = [
  {
    id: 'insc0001-0000-4000-8000-000000000001',
    church_id: MSU_ID,
    evento_id: '728d7879-7be1-4dcd-9b90-fbbb43eb0ad4', // Batismo nas Águas
    profile_id: '2d80ef13-a56d-414b-bd73-98e68d40cebd',
    origem: 'TAG',
    participant_name: 'Sunamita Martins da Silva Samuel',
    participant_email: 'sunamita-acd@hotmail.com',
    participant_phone: '14996431624',
    custom_answers: {},
    status: 'CONFIRMADA',
    valor_centavos: 0,
    pago_em: '2026-10-01T18:00:00Z',
    reserva_expira_em: null,
    created_at: '2026-10-01T18:00:00Z',
    confirmacao_enviada_em: '2026-10-01T18:01:00Z',
    ingresso_enviado_em: '2026-10-01T18:01:00Z'
  },
  {
    id: 'insc0001-0000-4000-8000-000000000002',
    church_id: MSU_ID,
    evento_id: '2341ee90-6819-4b00-b809-7ffb9307cbb9', // Acampamento
    profile_id: '5c42c6ae-7d4d-4107-9c8d-3805bccebbfc',
    origem: 'TAG',
    participant_name: 'Ricardo Colauto',
    participant_email: 'ricardocolauto8@gmail.com',
    participant_phone: '14997767274',
    custom_answers: {},
    status: 'CONFIRMADA',
    valor_centavos: 0,
    pago_em: '2026-10-05T19:20:00Z',
    reserva_expira_em: null,
    created_at: '2026-10-05T19:20:00Z',
    confirmacao_enviada_em: '2026-10-05T19:21:00Z',
    ingresso_enviado_em: '2026-10-05T19:21:00Z'
  }
];
tables.evento_ingresso = [
  { id: 'ing01', inscricao_id: 'insc0001-0000-4000-8000-000000000001', codigo: 'MSU-BAT-001', emitido_em: '2026-10-01T18:01:00Z', usado_em: null },
  { id: 'ing02', inscricao_id: 'insc0001-0000-4000-8000-000000000002', codigo: 'MSU-ACAMP-002', emitido_em: '2026-10-05T19:21:00Z', usado_em: null }
];

// SomosSistem Academy (Trilhas, Cursos, Aulas, Materiais, Progresso)
const TRILHA_1 = 'trilha01-0000-4000-8000-000000000001';
const TRILHA_2 = 'trilha01-0000-4000-8000-000000000002';
const CURSO_1 = '1';
const CURSO_2 = 'curso002-0000-4000-8000-000000000002';
const AULA_1 = 'aula0001-0000-4000-8000-000000000001';
const AULA_2 = 'aula0001-0000-4000-8000-000000000002';
const AULA_3 = 'aula0001-0000-4000-8000-000000000003';

tables.academy_trilha = [
  { id: TRILHA_1, titulo: 'Fundamentos do Ecossistema SomosSistem', subtitulo: 'Como engajar toda a igreja usando TAGs NFC, Pastoral e Gestão.', incluida: true, ordem: 1 },
  { id: TRILHA_2, titulo: 'Liderança, Voluntariado e Cultura do Reino', subtitulo: 'Formação prática para líderes de ministério, recepção e ação social.', incluida: true, ordem: 2 }
];
tables.academy_curso = [
  {
    id: CURSO_1,
    trilha_id: TRILHA_1,
    titulo: 'Dominando a TAG SomosSistem no Culto',
    descricao: 'Como apresentar a TAG nos avisos, receber visitantes e multiplicar ofertas com naturalidade.',
    descricao_longa: 'Aprenda passo a passo como o Ministério Somos Um utiliza as TAGs NFC nos bancos e equipes de recepção para acolher cada visitante em menos de 30 segundos.',
    capa: '/assets/logo-somos-um.png',
    ordem: 1,
    preco_centavos: 0,
    parcelas: 1,
    publicado: true
  },
  {
    id: CURSO_2,
    trilha_id: TRILHA_2,
    titulo: 'Gestão Pastoral, Social e Financeira Integrada',
    descricao: 'Do cartão de visitante ao acompanhamento pastoral e prestação de contas transparente.',
    descricao_longa: 'Curso completo para pastores, tesoureiros e líderes do ministério Fé com Pão operarem todas as ferramentas do Painel SomosSistem.',
    capa: '/assets/simbolo-somos-um.png',
    ordem: 2,
    preco_centavos: 0,
    parcelas: 1,
    publicado: true
  }
];
tables.academy_aula = [
  { id: AULA_1, curso_id: CURSO_1, titulo: '1. O Momento da Conexão no Culto', sobre: 'Como conduzir os 60 segundos de boas-vindas e aproximação da TAG NFC.', ordem: 1, duracao_seg: 420, publicada: true },
  { id: AULA_2, curso_id: CURSO_1, titulo: '2. Acolhimento Imediato pelo WhatsApp Pastoral', sobre: 'Fluxo prático da equipe de recepção e consolidação após o culto.', ordem: 2, duracao_seg: 540, publicada: true },
  { id: AULA_3, curso_id: CURSO_2, titulo: '1. Cuidado de Ovelhas e Ação Social Fé com Pão', sobre: 'Organizando cestas básicas, famílias atendidas e relatórios mensais.', ordem: 1, duracao_seg: 600, publicada: true }
];
tables.academy_aula_video = [
  { aula_id: AULA_1, caminho: 'videos/aula-1.mp4' },
  { aula_id: AULA_2, caminho: 'videos/aula-2.mp4' },
  { aula_id: AULA_3, caminho: 'videos/aula-3.mp4' }
];
tables.academy_material = [
  { id: 'mat01', aula_id: AULA_1, titulo: 'Roteiro de Avisos e Recepção · Somos Um (PDF)', descricao: 'Guia rápido para projetar no telão e treinar os voluntários.', arquivo: 'materiais/roteiro-culto-somos-um.pdf', ordem: 1 }
];
tables.academy_curso_liberado = [
  { church_id: MSU_ID, curso_id: CURSO_1, liberado_em: '2026-08-01T10:00:00Z' },
  { church_id: MSU_ID, curso_id: CURSO_2, liberado_em: '2026-08-01T10:00:00Z' }
];
tables.academy_curso_tela = [
  { tela: '/igreja', curso_id: CURSO_1 },
  { tela: '/dashboard', curso_id: CURSO_1 },
  { tela: '/pastoral', curso_id: CURSO_2 },
  { tela: '/social', curso_id: CURSO_2 }
];
tables.academy_progresso = [
  { profile_id: CLAUDEMIR_ID, church_id: MSU_ID, aula_id: AULA_1, posicao_seg: 420, concluida_em: '2026-10-01T15:00:00Z', atualizado_em: '2026-10-01T15:00:00Z' },
  { profile_id: CLAUDEMIR_ID, church_id: MSU_ID, aula_id: AULA_2, posicao_seg: 280, concluida_em: null, atualizado_em: '2026-10-15T15:00:00Z' }
];
tables.academy_nota = [
  { profile_id: CLAUDEMIR_ID, aula_id: AULA_1, texto: 'Treinar a equipe de recepção do culto de domingo com este roteiro.' }
];

// Loja TAG Catalog & Orders
tables.loja_produto = [
  { id: 'placa', sku: 'TAG-PLACA', nome: 'TAG Placa', nome_checkout: 'TAG Placa Rígida NFC · 10×6 cm', descricao: 'Rígida com adesivo 3M e furos para parafuso.', imagem_url: '/catalogo/placa.png', ativo: true, ordem: 1 },
  { id: 'etiqueta', sku: 'TAG-ETIQUETA', nome: 'TAG Etiqueta', nome_checkout: 'TAG Etiqueta Adesiva NFC · 5×5 cm', descricao: 'Adesivo flexível de alta aderência.', imagem_url: '/catalogo/etiqueta.png', ativo: true, ordem: 2 },
  { id: 'disco', sku: 'TAG-DISCO', nome: 'TAG Disco', nome_checkout: 'TAG Disco Resinado NFC · 8 cm', descricao: 'Acabamento premium em resina epóxi abaulada.', imagem_url: '/catalogo/disco.png', ativo: true, ordem: 3 },
  { id: 'flex', sku: 'TAG-FLEX', nome: 'TAG Flex', nome_checkout: 'TAG Flex com Cinta Elástica · 8 cm', descricao: 'Cinta elástica que abraça o encosto da cadeira.', imagem_url: '/catalogo/flex.png', ativo: true, ordem: 4 },
  { id: 'balcao', sku: 'TAG-BALCAO', nome: 'TAG Balcão', nome_checkout: 'Display TAG Balcão NFC · 12 cm', descricao: 'Display de mesa para recepção, café e livraria.', imagem_url: '/catalogo/balcao.png', ativo: true, ordem: 5 },
  { id: 'pulseira', sku: 'TAG-PULSEIRA', nome: 'TAG Pulseira', nome_checkout: 'Pulseira NFC Voluntário · 25 mm', descricao: 'No pulso do voluntário de recepção e eventos.', imagem_url: '/catalogo/pulseira.png', ativo: true, ordem: 6 }
];
tables.loja_preco_faixa = [
  { produto_id: 'placa', qtd_min: 10, valor_centavos: 890 },
  { produto_id: 'placa', qtd_min: 50, valor_centavos: 890 },
  { produto_id: 'placa', qtd_min: 100, valor_centavos: 790 },
  { produto_id: 'placa', qtd_min: 250, valor_centavos: 720 },
  { produto_id: 'etiqueta', qtd_min: 10, valor_centavos: 490 },
  { produto_id: 'etiqueta', qtd_min: 50, valor_centavos: 490 },
  { produto_id: 'etiqueta', qtd_min: 100, valor_centavos: 420 },
  { produto_id: 'etiqueta', qtd_min: 250, valor_centavos: 380 },
  { produto_id: 'disco', qtd_min: 10, valor_centavos: 1090 },
  { produto_id: 'disco', qtd_min: 50, valor_centavos: 1090 },
  { produto_id: 'disco', qtd_min: 100, valor_centavos: 990 },
  { produto_id: 'disco', qtd_min: 250, valor_centavos: 890 },
  { produto_id: 'flex', qtd_min: 10, valor_centavos: 690 },
  { produto_id: 'flex', qtd_min: 50, valor_centavos: 690 },
  { produto_id: 'flex', qtd_min: 100, valor_centavos: 590 },
  { produto_id: 'flex', qtd_min: 250, valor_centavos: 540 },
  { produto_id: 'balcao', qtd_min: 10, valor_centavos: 1490 },
  { produto_id: 'balcao', qtd_min: 50, valor_centavos: 1490 },
  { produto_id: 'balcao', qtd_min: 100, valor_centavos: 1290 },
  { produto_id: 'balcao', qtd_min: 250, valor_centavos: 1190 },
  { produto_id: 'pulseira', qtd_min: 10, valor_centavos: 790 },
  { produto_id: 'pulseira', qtd_min: 50, valor_centavos: 790 },
  { produto_id: 'pulseira', qtd_min: 100, valor_centavos: 690 },
  { produto_id: 'pulseira', qtd_min: 250, valor_centavos: 620 }
];

const PEDIDO_1 = 'ped00001-0000-4000-8000-000000000001';
const PEDIDO_2 = 'ped00001-0000-4000-8000-000000000002';
const PED_ITEM_1 = 'pitem001-0000-4000-8000-000000000001';
const PED_ITEM_2 = 'pitem001-0000-4000-8000-000000000002';

tables.loja_pedido = [
  {
    id: PEDIDO_1,
    checkout_id: 'chk_somosum_botucatu_001',
    status: 'PAGO',
    etapa_producao: 'ENTREGUE',
    total_centavos: 158000,
    comprador_nome: 'Claudemir Silva',
    comprador_email: 'calfatec@gmail.com',
    comprador_telefone: '14981447428',
    comprador_cpf_cnpj: '46.328.262/0001-80',
    igreja_nome: 'Ministério Somos Um',
    endereco_cep: '18600-000',
    endereco_logradouro: 'Avenida Brasil',
    endereco_numero: '170',
    endereco_complemento: 'Templo Sede',
    endereco_bairro: 'Centro',
    endereco_cidade: 'Botucatu',
    endereco_uf: 'SP',
    cupom_id: null,
    desconto_centavos: 0,
    observacao: 'Logo oficial colorido Ministério Somos Um',
    church_id: MSU_ID,
    provisionado_em: '2026-08-01T10:00:00Z',
    created_at: '2026-08-01T09:30:00Z'
  },
  {
    id: PEDIDO_2,
    checkout_id: 'chk_somosum_avare_002',
    status: 'PAGO',
    etapa_producao: 'GRAVACAO',
    total_centavos: 89000,
    comprador_nome: 'Pr. André Ribeiro',
    comprador_email: 'somosumbotucatu@gmail.com',
    comprador_telefone: '14998568857',
    comprador_cpf_cnpj: '46.328.262/0002-61',
    igreja_nome: 'Ministério Somos Um Avaré',
    endereco_cep: '18700-000',
    endereco_logradouro: 'Rua Rio Grande do Sul',
    endereco_numero: '1450',
    endereco_complemento: null,
    endereco_bairro: 'Centro',
    endereco_cidade: 'Avaré',
    endereco_uf: 'SP',
    cupom_id: null,
    desconto_centavos: 0,
    observacao: 'Kit expansão campus Avaré',
    church_id: AVARE_ID,
    provisionado_em: '2026-10-15T14:00:00Z',
    created_at: '2026-10-15T13:45:00Z'
  }
];
tables.loja_pedido_item = [
  {
    id: PED_ITEM_1,
    pedido_id: PEDIDO_1,
    produto_id: 'placa',
    nome: 'TAG Placa Rígida NFC · 10×6 cm',
    quantidade: 200,
    valor_unitario_centavos: 790,
    cor_hex: '#BF1F2C',
    logo_url: '/assets/simbolo-somos-um.png',
    nome_igreja: 'Ministério Somos Um',
    fixacao: 'ADESIVO_REFORCADO',
    selo_pix: true,
    chave_pix: '46328262000180',
    qr_code: true
  },
  {
    id: PED_ITEM_2,
    pedido_id: PEDIDO_2,
    produto_id: 'disco',
    nome: 'TAG Disco Resinado NFC · 8 cm',
    quantidade: 100,
    valor_unitario_centavos: 890,
    cor_hex: '#0D3640',
    logo_url: '/assets/simbolo-somos-um.png',
    nome_igreja: 'Ministério Somos Um Avaré',
    fixacao: 'ADESIVO_REFORCADO',
    selo_pix: true,
    chave_pix: '46328262000180',
    qr_code: true
  }
];
tables.loja_tag_gravada = [
  { id: 'tagg01', pedido_item_id: PED_ITEM_1, nfc_id: 'MSU0001A', url: 'https://tag.somossistem.com/home/redirect?church=msu&id=MSU0001A', gravada_em: '2026-08-02T14:00:00Z', gravada_por: CLAUDEMIR_ID, created_at: '2026-08-02T14:00:00Z' },
  { id: 'tagg02', pedido_item_id: PED_ITEM_1, nfc_id: 'MSU0002B', url: 'https://tag.somossistem.com/home/redirect?church=msu&id=MSU0002B', gravada_em: '2026-08-02T14:05:00Z', gravada_por: CLAUDEMIR_ID, created_at: '2026-08-02T14:05:00Z' }
];

// Editor SomosSistem
tables.editor_versao = [];
tables.branding = [
  { id: 'br01', church_id: MSU_ID, logo_url: '/assets/simbolo-somos-um.png', splash_url: '/assets/logo-somos-um.png', primary_color: '#BF1F2C', secondary_color: '#0D3640' }
];
tables.church_integration = [
  { church_id: MSU_ID, provider: 'ESCALA_EXCELENTE', external_church_id: 'escala_msu_01', label: 'Ministério Somos Um · Botucatu' }
];
tables.auditoria_seguranca = [
  { id: 'aud01', church_id: MSU_ID, entidade_id: 'finc0001-0000-4000-8000-000000000001', operacao: 'CONTA_APROVADA', ocorrido_em: '2026-08-02T10:00:00Z', ator_email: 'calfatec@gmail.com', resumo: 'Conta digital de recebimento ativada para Ministério Somos Um.' }
];

const seed = {
  tables,
  rpcs: msu.rpcs,
  superadmin: {
    planos: [
      {
        codigo: 'essencial',
        nome: 'Plano Essencial SomosSistem',
        preco_centavos: 19900,
        modulos: ['tag', 'metricas', 'forms', 'galeria']
      },
      {
        codigo: 'pastoral',
        nome: 'Plano Gestão & Pastoral',
        preco_centavos: 34900,
        modulos: ['tag', 'metricas', 'forms', 'galeria', 'pastoral', 'social', 'escala']
      },
      {
        codigo: 'completo',
        nome: 'Plano Completo SomosSistem Pro',
        preco_centavos: 49900,
        modulos: ['tag', 'metricas', 'galeria', 'forms', 'pastoral', 'financas', 'social', 'escala', 'editor']
      }
    ],
    auditoria: [
      {
        id: 'sa_aud_01',
        quando: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
        resumo: 'Habilitou todos os módulos do Plano Completo SomosSistem Pro',
        sensivel: false,
        igreja: 'Ministério Somos Um',
        acao: 'church.module.enable',
        motivo: 'Configuração completa do ecossistema SomosSistem',
        duracao_segundos: null,
        alteracao: null,
        ator: 'calfatec@gmail.com',
        origem: 'SomosSistem',
        ip: '127.0.0.1'
      },
      {
        id: 'sa_aud_02',
        quando: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
        resumo: 'Provisionou 200 TAGs Placa NFC para Ministério Somos Um',
        sensivel: false,
        igreja: 'Ministério Somos Um',
        acao: 'loja.pedido.provisionar',
        motivo: null,
        duracao_segundos: null,
        alteracao: null,
        ator: 'calfatec@gmail.com',
        origem: 'Igrejas',
        ip: '127.0.0.1'
      },
      {
        id: 'sa_aud_03',
        quando: new Date(Date.now() - 3600 * 1000 * 40).toISOString(),
        resumo: 'Atualizou identidade visual e paleta oficial SomosSistem (#BF1F2C · #0D3640)',
        sensivel: true,
        igreja: 'Plataforma',
        acao: 'platform.branding.update',
        motivo: 'Migração oficial para marca SomosSistem',
        duracao_segundos: null,
        alteracao: null,
        ator: 'calfatec@gmail.com',
        origem: 'Sistema',
        ip: '127.0.0.1'
      }
    ],
    editor_trabalhos: [
      {
        id: 'trab-somos-um-01',
        church_id: MSU_ID,
        nome: 'Mensagem Domingo · Para Que Todos Sejam Um (João 17:21).mp4',
        duracao: 2480,
        tamanho: 412800000,
        envio: 'enviado',
        criadoEm: new Date(Date.now() - 86400000 * 2).toISOString(),
        visto: true,
        versoes: [
          {
            id: 'ver-somos-um-01',
            numero: 1,
            rotulo: 'V1 · Cortes Dinâmicos + Áudio Masterizado',
            estado: 'pronto',
            percentual: 100,
            etapa: 'Finalizado',
            escolhas: { zoom: 115, lut: true, som: 'automatico' },
            criado_em: new Date(Date.now() - 86400000 * 2).toISOString(),
            pronto_em: new Date(Date.now() - 86400000 * 2 + 480000).toISOString(),
            visto_em: new Date(Date.now() - 86400000).toISOString(),
            substituida_em: null,
            falha: null
          }
        ]
      }
    ],
    conversas_agente: [
      {
        conversa_id: 'conv-somos-01',
        titulo: 'Resumo de Engajamento e Doações · Ministério Somos Um',
        atualizada_em: new Date(Date.now() - 1800000).toISOString(),
        pendencia: false,
        mensagens: [
          {
            id: 'msg-1',
            papel: 'user',
            texto: 'Qual o panorama atual do Ministério Somos Um na plataforma SomosSistem?',
            criada_em: new Date(Date.now() - 1860000).toISOString()
          },
          {
            id: 'msg-2',
            papel: 'assistant',
            texto: 'O **Ministério Somos Um (Botucatu)** conta atualmente com **139 membros ativos**, **142 registros de captação via TAG NFC** (visitantes, pedidos de oração e decisões), **25 ministérios estruturados** e **R$ 14.210,50 em entradas financeiras conferidas** neste mês. Todos os módulos do **SomosSistem Pro** estão ativos e operando sem pendências.',
            criada_em: new Date(Date.now() - 1800000).toISOString()
          }
        ]
      }
    ]
  }
};

fs.writeFileSync(path.join(DATA_DIR, 'seed.json'), JSON.stringify(seed, null, 2), 'utf8');
console.log('Seed database generated at data/seed.json with', Object.keys(seed.tables).length, 'tables!');
