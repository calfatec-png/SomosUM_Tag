# SomosSistem · Ecossistema Completo Ministério Somos Um

Plataforma completa **SomosSistem** (Painel da Igreja, SuperAdmin Plataforma, App Público TAG NFC/QR Code, Loja Oficial de Tags e Site Institucional), personalizada com a identidade visual e paleta de cores oficial do **Ministério Somos Um**.

## Paleta Oficial Aplicada
- `#BF1F2C` — Crimson Red (Primária)
- `#BF1744` — Ruby Rose (Hover / Destaque)
- `#A61458` — Deep Magenta (Gradiente / Acento)
- `#BF0F70` — Vibrant Magenta (Badges / Indicadores)
- `#0D3640` — Deep Petrol Teal (Secundária / Contraste / SuperAdmin)

## Módulos e Rotas Incluídos (100% Funcionais e Autônomos)

### 1. Painel da Igreja (`/dashboard`)
- **Visão Geral**: `/dashboard`
- **Minha Igreja (Configuração TAG, QR Code, Cultos, Grupos, Formulários)**: `/igreja`
- **Membros & Visitantes**: `/membros`
- **Pedidos de Oração**: `/oracoes`
- **Doações & Conta Digital**: `/doacoes`, `/doacoes/conta`
- **Inscrições & Eventos**: `/eventos`
- **Cursos**: `/cursos`
- **Editor SomosSistem (Edição Automática de Vídeos)**: `/editor`
- **SomosSistem Academy (Trilhas, Cursos, Aulas e Progresso da Equipe)**: `/academy`, `/academy/equipe`, `/academy/1`, `/academy/1/aulas/1`
- **Pastoral (Cuidado de Ovelhas, Acompanhamentos, Contatos, Encaminhamentos)**: `/pastoral`, `/pastoral/pessoa/:id`
- **Escalas SomosSistem (Escalas de Cultos e Estatísticas de Voluntários)**: `/escala`
- **Ministérios & Líderes**: `/ministerios`
- **Social · Fé com Pão (Visão Geral, Estoque, Famílias, Entregas, Entradas, Mutirão, Solicitações)**:
  - `/social`, `/social/estoque`, `/social/familias`, `/social/entregas`, `/social/entradas`, `/social/mutirao`, `/social/solicitacoes`, `/social/beneficiarios/:id`
- **Finanças (Resumo, Extrato, Entradas, Saídas, Boletos Fixos, Recebedores, Configurações)**:
  - `/financas`, `/financas/extrato`, `/financas/entradas`, `/financas/saidas`, `/financas/boletos`, `/financas/recebedores`, `/financas/config`
- **Métricas & Analítico**:
  - `/metricas`, `/metricas/doacoes`, `/metricas/inscricoes`, `/metricas/membros`, `/metricas/social`, `/metricas/visitantes`
- **Configurações, Acessos por Área, Segurança e Termos**:
  - `/settings`, `/settings/users`, `/settings/security`, `/settings/legal`, `/privacidade`, `/termos`

### 2. Painel SuperAdmin Plataforma (`/admin`)
- **Visão Geral de Negócio (MRR, Adoção por Módulo, Novas Igrejas)**: `/admin`
- **Gestão de Igrejas e Ficha Completa da Igreja**: `/admin/igrejas`, `/admin/igrejas/:id`
- **Gestão de Planos e Módulos**: `/admin/planos`
- **Gestão da Loja TAG e Pedidos (Produção, Gravação NFC e Envio)**: `/admin/loja`, `/admin/loja/pedidos`
- **Gestão da SomosSistem Academy**: `/admin/academy`, `/admin/academy/igrejas`, `/admin/academy/cursos/:id`
- **Agente IA SomosSistem**: `/admin/agente`
- **Auditoria Completa da Plataforma**: `/admin/auditoria`

### 3. Ecossistema Público Integrado
- **App Público TAG NFC / QR Code**: `/tag/home?church=msu` (ou `/home?church=msu`)
- **Loja Oficial de Tags NFC**: `/loja`, `/catalogo`, `/produto/placa`, `/carrinho`, `/checkout`
- **Site Institucional**: `/site`

## Como Rodar Localmente

```bash
npm start
```

O servidor iniciará em `http://localhost:3000`.

## Deploy no Render e GitHub

O projeto já inclui [`render.yaml`](render.yaml) e [`Dockerfile`](Dockerfile) prontos para deploy imediato no Render sem necessidade de variáveis externas:
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Health Check Path**: `/healthz`
