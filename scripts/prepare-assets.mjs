import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SCRATCH = 'C:/Users/calfa/.gemini/antigravity/brain/4d14607f-9038-4183-bfdb-b34dc1bae4c7/scratch';
const UPLOADED = 'C:/Users/calfa/.gemini/antigravity/brain/4d14607f-9038-4183-bfdb-b34dc1bae4c7/.user_uploaded';

const IGEX_DIR = path.join(SCRATCH, 'igex_dump');
const TAG_DIR = path.join(SCRATCH, 'tag_dump');
const LOJA_DIR = path.join(SCRATCH, 'loja_dump');

if (!fs.existsSync(IGEX_DIR)) {
  console.log('Pre-built assets in public/ are already present. Skipping local scratch extraction.');
  process.exit(0);
}

const PUBLIC_DIR = path.join(ROOT, 'public');
const CHUNKS_DIR = path.join(PUBLIC_DIR, '_next', 'static', 'chunks');
const MEDIA_DIR = path.join(PUBLIC_DIR, '_next', 'static', 'media');
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');
const CATALOGO_DIR = path.join(PUBLIC_DIR, 'catalogo');
const PAGES_DIR = path.join(PUBLIC_DIR, 'pages');
const TAG_PAGES_DIR = path.join(PUBLIC_DIR, 'tag-pages');
const LOJA_PAGES_DIR = path.join(PUBLIC_DIR, 'loja-pages');

for (const d of [PUBLIC_DIR, CHUNKS_DIR, MEDIA_DIR, ASSETS_DIR, CATALOGO_DIR, PAGES_DIR, TAG_PAGES_DIR, LOJA_PAGES_DIR]) {
  fs.mkdirSync(d, { recursive: true });
}

// 1. Copy uploaded logos & palette reference
const LOGO_FULL_SRC = path.join(UPLOADED, 'media_1792795367445_f6491c16.png');
const LOGO_ROUND_SRC = path.join(UPLOADED, 'media_1792795457461_fd106316.png');
const PALETTE_SRC = path.join(UPLOADED, 'media_1792795346968_0c26408f.jpg');

if (fs.existsSync(LOGO_FULL_SRC)) {
  fs.copyFileSync(LOGO_FULL_SRC, path.join(ASSETS_DIR, 'logo-somos-um.png'));
  fs.copyFileSync(LOGO_FULL_SRC, path.join(PUBLIC_DIR, 'logo-igex.png'));
}
if (fs.existsSync(LOGO_ROUND_SRC)) {
  fs.copyFileSync(LOGO_ROUND_SRC, path.join(ASSETS_DIR, 'simbolo-somos-um.png'));
  fs.copyFileSync(LOGO_ROUND_SRC, path.join(MEDIA_DIR, 'igex-simbolo.188z-ivxpawv6.png'));
  fs.copyFileSync(LOGO_ROUND_SRC, path.join(PUBLIC_DIR, 'logo-symbol-ink.png'));
  fs.copyFileSync(LOGO_ROUND_SRC, path.join(PUBLIC_DIR, 'favicon.png'));
}
if (fs.existsSync(PALETTE_SRC)) {
  fs.copyFileSync(PALETTE_SRC, path.join(ASSETS_DIR, 'paleta-somossistem.jpg'));
}

// Create SVG icon wrapping the round emblem
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="ssGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#BF1F2C" />
      <stop offset="35%" stop-color="#BF1744" />
      <stop offset="70%" stop-color="#A61458" />
      <stop offset="100%" stop-color="#0D3640" />
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#ssGrad)" />
  <image href="/assets/simbolo-somos-um.png" x="2" y="2" width="60" height="60" />
</svg>`;
fs.writeFileSync(path.join(PUBLIC_DIR, 'icon.svg'), iconSvg, 'utf8');

// Helper to apply rebranding & color palette transformations to JS/HTML/CSS text
function transformText(content) {
  let out = content;

  // 1. Unlock all sections in chunks__1rag56p76x2qz.js
  out = out.replace(
    /a\.default\.env\.NEXT_PUBLIC_SECOES_LIBERADAS/g,
    '"doacoes,academy,loja"'
  );

  // 2. Make isSuperAdmin dynamic based on /admin path so the user can seamlessly access both /dashboard and /admin!
  out = out.replace(
    /isSuperAdmin:[a-zA-Z0-9_$]+\.is_super_admin\?\?!1/g,
    'get isSuperAdmin(){return"undefined"!=typeof window&&window.location.pathname.startsWith("/admin")}'
  );

  // 3. Prevent /dashboard from redirecting to /admin if isSuperAdmin is true
  out = out.replace(
    /I&&!\$&&\(0,a\.redirect\)\("\/admin"\)/g,
    '!1'
  );

  // 4. Intercept Supabase storage URLs in static strings
  out = out.replace(
    /https:\/\/skzbdgxwvzhkhbhriuwd\.supabase\.co\/storage\/v1\/object\/public\//g,
    '/supabase/storage/v1/object/public/'
  );

  // 5. External ecosystem URLs -> local routes
  out = out.replace(/!r\.startsWith\("https:\/\/"\)/g, '!1');
  out = out.replace(/https:\/\/nova\.tag\.igrejaexcelente\.com/g, '/tag');
  out = out.replace(/https:\/\/tag\.igrejaexcelente\.com/g, '/tag');
  out = out.replace(/https:\/\/loja\.igrejaexcelente\.com/g, '/loja');

  // 6. Rebranding strings: Excelente / Exelente / IGEX -> SomosSistem
  const textReplacements = [
    ['Igreja Excelente', 'SomosSistem'],
    ['igreja excelente', 'SomosSistem'],
    ['IGREJA EXCELENTE', 'SOMOSSISTEM'],
    ['Igreja Exelente', 'SomosSistem'],
    ['Editor Excelente', 'Editor SomosSistem'],
    ['Escala Excelente', 'Escala SomosSistem'],
    ['Escalas Excelente', 'Escalas SomosSistem'],
    ['Tag Excelente', 'Tag SomosSistem'],
    ['TAG Excelente', 'TAG SomosSistem'],
    ['Painel IGEX', 'Painel SomosSistem'],
    ['IGEX Core', 'SomosSistem Core'],
    ['IGEX Academy', 'SomosSistem Academy'],
    ['Loja IGEX', 'Loja SomosSistem'],
    ['Agente IGEX', 'Agente SomosSistem'],
    ['Equipe IGEX', 'Equipe SomosSistem'],
    ['na IGEX desde', 'no SomosSistem desde'],
    ['Fale com a IGEX', 'Fale com a SomosSistem'],
    ['fale com a IGEX', 'fale com a SomosSistem'],
    ['A IGEX atua', 'A SomosSistem atua'],
    ['pela IGEX', 'pela SomosSistem'],
    ['da IGEX', 'da SomosSistem'],
    ['com a IGEX', 'com a SomosSistem'],
    ['para a IGEX', 'para a SomosSistem'],
    ['title:"IGEX"', 'title:"SomosSistem"'],
    ['children:"IGEX"', 'children:"SomosSistem"'],
    ['children:"igex"', 'children:"SomosSistem"'],
    ['?"IGEX":', '?"SomosSistem":'],
    ['["IGEX","IGEX"]', '["IGEX","SomosSistem"]'],
    ['suporte@igrejaexcelente.com', 'suporte@somossistem.com'],
    ['contato@igrejaexcelente.com', 'contato@somossistem.com'],
    ['igrejaexcelente.com.br', 'somossistem.com.br'],
    ['igrejaexcelente.com', 'somossistem.com'],
    ['Excelente', 'SomosSistem'],
    ['Exelente', 'SomosSistem'],
  ];

  for (const [from, to] of textReplacements) {
    out = out.split(from).join(to);
  }

  // 7. Color palette transformations (#BF1F2C, #BF1744, #A61458, #BF0F70, #0D3640)
  const colorReplacements = [
    ['#00E5CC', '#BF1F2C'],
    ['#00e5cc', '#BF1F2C'],
    ['#00C2AD', '#BF1744'],
    ['#00c2ad', '#BF1744'],
    ['#00A896', '#A61458'],
    ['#00a896', '#A61458'],
    ['#00806F', '#BF1F2C'],
    ['#00806f', '#BF1F2C'],
    ['#007566', '#A61458'],
    ['#7FD9CF', '#FF8FA3'],
    ['#7fd9cf', '#FF8FA3'],
    ['#8EDDD2', '#FF8FA3'],
    ['#8eddd2', '#FF8FA3'],
    ['#0F2E2A', '#FAFAF7'],
    ['#0f2e2a', '#FAFAF7'],
    ['#C8F34E', '#BF1F2C'],
    ['#c8f34e', '#BF1F2C'],
    ['#D4FF59', '#BF1744'],
    ['#d4ff59', '#BF1744'],
  ];

  for (const [from, to] of colorReplacements) {
    out = out.split(from).join(to);
  }

  return out;
}

// Custom CSS theme overrides for the 5-color palette (#BF1F2C, #BF1744, #A61458, #BF0F70, #0D3640)
const SOMOSSISTEM_CSS_OVERRIDES = `
/* === SOMOSSISTEM CUSTOM PALETTE & DESIGN SYSTEM === */
:root, .dark {
  --brand-crimson: #BF1F2C;
  --brand-ruby: #BF1744;
  --brand-magenta: #A61458;
  --brand-vibrant: #BF0F70;
  --brand-petrol: #0D3640;

  --primary: #BF1F2C !important;
  --primary-foreground: #FAFAF7 !important;
  --secondary: #0D3640 !important;
  --secondary-foreground: #FAFAF7 !important;
  --ring: #BF1744 !important;
  --accent: rgba(191, 31, 44, 0.08) !important;
  --accent-foreground: #BF1F2C !important;

  --sidebar-primary: #BF1F2C !important;
  --sidebar-primary-foreground: #FAFAF7 !important;
  --sidebar-ring: #BF1744 !important;
  --sidebar-accent: rgba(13, 54, 64, 0.07) !important;

  --chart-1: #BF1F2C !important;
  --chart-2: #0D3640 !important;
  --chart-3: #A61458 !important;
  --chart-4: #BF0F70 !important;
  --chart-5: #BF1744 !important;
}

/* SuperAdmin dark platform sidebar in Deep Petrol Teal (#0D3640) */
[data-platform="true"] {
  background: linear-gradient(180deg, #0D3640 0%, #072229 100%) !important;
  --sidebar-foreground: #FAFAF7 !important;
  --sidebar-muted-foreground: #B8CFD4 !important;
  --sidebar-dim-foreground: #FF8FA3 !important;
  --sidebar-accent: rgba(191, 31, 44, 0.22) !important;
  --sidebar-accent-foreground: #FAFAF7 !important;
  --sidebar-border: rgba(250, 250, 247, 0.12) !important;
  --primary: #BF1F2C !important;
  --primary-foreground: #FAFAF7 !important;
}

/* Login Left Hero Panel Gradient & Contrast */
.bg-primary.min-\\[960px\\]\\:flex {
  background: linear-gradient(140deg, #0D3640 0%, #A61458 48%, #BF1744 78%, #BF1F2C 100%) !important;
  color: #FAFAF7 !important;
  position: relative;
  overflow: hidden;
}
.bg-primary.min-\\[960px\\]\\:flex * {
  color: #FAFAF7 !important;
  border-color: rgba(250, 250, 247, 0.22) !important;
}
.bg-primary.min-\\[960px\\]\\:flex img {
  filter: none !important;
  border-radius: 50%;
}

/* Ensure primary buttons have crisp white text */
button.bg-primary, a.bg-primary, [class*="bg-primary "] {
  color: #FAFAF7 !important;
}

/* Active navigation pill indicator in SomosSistem Crimson/Ruby */
nav[aria-label="Menu principal"] a[aria-current="page"] {
  background: linear-gradient(90deg, rgba(191, 31, 44, 0.12) 0%, rgba(166, 20, 88, 0.06) 100%) !important;
  color: #BF1F2C !important;
  font-weight: 700 !important;
  border-left: 3px solid #BF1F2C !important;
}
[data-platform="true"] nav[aria-label="Menu principal"] a[aria-current="page"] {
  background: linear-gradient(90deg, #BF1F2C 0%, #A61458 100%) !important;
  color: #FAFAF7 !important;
  border-left: 3px solid #FF8FA3 !important;
}
`;

// Process IGEX dump files
for (const file of fs.readdirSync(IGEX_DIR)) {
  const fullPath = path.join(IGEX_DIR, file);
  if (!fs.statSync(fullPath).isFile()) continue;

  if (file.startsWith('chunks__')) {
    const outName = file.slice('chunks__'.length);
    if (file.endsWith('.js') || file.endsWith('.css')) {
      let txt = fs.readFileSync(fullPath, 'utf8');
      txt = transformText(txt);
      if (file.endsWith('.css')) {
        txt += '\n' + SOMOSSISTEM_CSS_OVERRIDES;
      }
      fs.writeFileSync(path.join(CHUNKS_DIR, outName), txt, 'utf8');
    } else {
      fs.copyFileSync(fullPath, path.join(CHUNKS_DIR, outName));
    }
  } else if (file.startsWith('media__')) {
    const outName = file.slice('media__'.length);
    if (outName.includes('igex-simbolo') && fs.existsSync(LOGO_ROUND_SRC)) {
      fs.copyFileSync(LOGO_ROUND_SRC, path.join(MEDIA_DIR, outName));
    } else {
      fs.copyFileSync(fullPath, path.join(MEDIA_DIR, outName));
    }
  }
}

// Process TAG dump files
for (const file of fs.readdirSync(TAG_DIR)) {
  const fullPath = path.join(TAG_DIR, file);
  if (!fs.statSync(fullPath).isFile()) continue;

  if (file.startsWith('chunks__')) {
    const outName = file.slice('chunks__'.length);
    let txt = fs.readFileSync(fullPath, 'utf8');
    txt = transformText(txt);
    if (file.endsWith('.css')) {
      txt += '\n' + SOMOSSISTEM_CSS_OVERRIDES;
    }
    fs.writeFileSync(path.join(CHUNKS_DIR, outName), txt, 'utf8');
  } else if (file.startsWith('media__')) {
    const outName = file.slice('media__'.length);
    fs.copyFileSync(fullPath, path.join(MEDIA_DIR, outName));
  } else if (file.endsWith('.html')) {
    let html = fs.readFileSync(fullPath, 'utf8');
    html = transformText(html);
    html = html.replace('<head>', '<head><script src="/assets/somossistem-enhancer.js"></script>');
    fs.writeFileSync(path.join(TAG_PAGES_DIR, file), html, 'utf8');
  }
}

// Process LOJA dump files
for (const file of fs.readdirSync(LOJA_DIR)) {
  const fullPath = path.join(LOJA_DIR, file);
  if (!fs.statSync(fullPath).isFile()) continue;

  if (file.startsWith('chunks__')) {
    const outName = file.slice('chunks__'.length);
    let txt = fs.readFileSync(fullPath, 'utf8');
    txt = transformText(txt);
    if (file.endsWith('.css')) {
      txt += '\n' + SOMOSSISTEM_CSS_OVERRIDES;
    }
    fs.writeFileSync(path.join(CHUNKS_DIR, outName), txt, 'utf8');
  } else if (file.startsWith('media__')) {
    const outName = file.slice('media__'.length);
    fs.copyFileSync(fullPath, path.join(MEDIA_DIR, outName));
  } else if (file.endsWith('.html')) {
    let html = fs.readFileSync(fullPath, 'utf8');
    html = transformText(html);
    html = html.replace('<head>', '<head><script src="/assets/somossistem-enhancer.js"></script>');
    fs.writeFileSync(path.join(LOJA_PAGES_DIR, file), html, 'utf8');
  }
}

// Copy Loja /catalogo/*.png images
const lojaCatalogoSrc = path.join(LOJA_DIR, 'catalogo');
if (fs.existsSync(lojaCatalogoSrc)) {
  for (const img of fs.readdirSync(lojaCatalogoSrc)) {
    fs.copyFileSync(path.join(lojaCatalogoSrc, img), path.join(CATALOGO_DIR, img));
  }
}

// Process IGEX HTML shells
const htmlDir = path.join(IGEX_DIR, 'html');
for (const file of fs.readdirSync(htmlDir)) {
  if (!file.endsWith('.html')) continue;
  let html = fs.readFileSync(path.join(htmlDir, file), 'utf8');
  html = transformText(html);
  html = html.replace('<head>', '<head><script src="/assets/somossistem-enhancer.js"></script>');
  fs.writeFileSync(path.join(PAGES_DIR, file), html, 'utf8');
}

// Also process landing.html
const landingPath = path.join(IGEX_DIR, 'landing.html');
if (fs.existsSync(landingPath)) {
  let html = fs.readFileSync(landingPath, 'utf8');
  html = transformText(html);
  html = html.replace('<head>', '<head><script src="/assets/somossistem-enhancer.js"></script>');
  fs.writeFileSync(path.join(PAGES_DIR, 'landing.html'), html, 'utf8');
}

// Write somossistem-enhancer.js
const enhancerJs = `(function() {
  'use strict';

  var SUPA_ORIGIN = 'https://skzbdgxwvzhkhbhriuwd.supabase.co';
  var STORAGE_KEY = 'sb-skzbdgxwvzhkhbhriuwd-auth-token';

  function b64url(str) {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\\+/g, '-')
      .replace(/\\//g, '_')
      .replace(/=+$/, '');
  }

  function buildDefaultSession() {
    var now = Math.floor(Date.now() / 1000);
    var exp = now + 86400 * 30;
    var header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    var user = {
      id: '9d866689-a4ec-4c41-931c-df865c189a59',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'calfatec@gmail.com',
      email_confirmed_at: '2026-09-06T21:58:33.742061Z',
      phone: '',
      confirmed_at: '2026-09-06T21:58:33.742061Z',
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {
        email: 'calfatec@gmail.com',
        email_verified: true,
        name: 'Claudemir Silva',
        church_id: '7d7b2b25-05c2-4622-9efb-f88838578770'
      },
      identities: [],
      factors: [
        {
          id: 'factor-somossistem-totp-1',
          friendly_name: 'Painel SomosSistem',
          factor_type: 'totp',
          status: 'verified',
          created_at: '2026-09-06T21:58:33.742061Z',
          updated_at: '2026-09-06T21:58:33.742061Z'
        }
      ],
      created_at: '2026-09-06T21:58:33.742061Z',
      updated_at: new Date().toISOString()
    };
    var payload = b64url(JSON.stringify({
      aud: 'authenticated',
      exp: exp,
      iat: now,
      iss: SUPA_ORIGIN + '/auth/v1',
      sub: user.id,
      email: user.email,
      phone: '',
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
      role: 'authenticated',
      aal: 'aal2',
      amr: [
        { method: 'password', timestamp: now },
        { method: 'totp', timestamp: now }
      ],
      session_id: '7d7b2b25-05c2-4622-9efb-f88838578770'
    }));
    var accessToken = header + '.' + payload + '.somossistem_sig';
    return {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: 86400 * 30,
      expires_at: exp,
      refresh_token: 'somossistem-refresh-token',
      user: user
    };
  }

  function ensureSession() {
    try {
      if (window.location.pathname === '/login') return;
      if (sessionStorage.getItem('ss_logged_out') === '1') return;
      var existing = localStorage.getItem(STORAGE_KEY);
      if (!existing) {
        var session = buildDefaultSession();
        var raw = JSON.stringify(session);
        localStorage.setItem(STORAGE_KEY, raw);
        document.cookie = STORAGE_KEY + '=base64-' + b64url(raw) + '; path=/; max-age=2592000; samesite=lax';
      }
    } catch (e) {}
  }

  ensureSession();

  // Wrap window.fetch BEFORE Next.js and Supabase chunks initialize
  var origFetch = window.fetch.bind(window);
  window.fetch = function(input, init) {
    try {
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : String(input));
      if (url.indexOf(SUPA_ORIGIN) === 0) {
        var newUrl = window.location.origin + '/supabase' + url.slice(SUPA_ORIGIN.length);
        if (newUrl.indexOf('/auth/v1/logout') !== -1) {
          sessionStorage.setItem('ss_logged_out', '1');
          localStorage.removeItem(STORAGE_KEY);
        } else if (newUrl.indexOf('/auth/v1/token') !== -1) {
          sessionStorage.removeItem('ss_logged_out');
        }
        if (typeof input === 'string') {
          input = newUrl;
        } else if (input instanceof Request) {
          input = new Request(newUrl, input);
        }
      }
    } catch (e) {}
    return origFetch(input, init);
  };

  function enhanceUI() {
    // 1. Inject Ministério Somos Um round emblem into Sidebar header
    var sidebarBrandLink = document.querySelector('div[data-platform] > div:first-child a');
    if (sidebarBrandLink && !sidebarBrandLink.querySelector('.ss-brand-logo')) {
      var img = document.createElement('img');
      img.src = '/assets/simbolo-somos-um.png';
      img.alt = 'Ministério Somos Um';
      img.className = 'ss-brand-logo';
      img.style.cssText = 'width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;box-shadow:0 2px 8px rgba(191,31,44,0.35);border:1.5px solid rgba(191,31,44,0.5);';
      sidebarBrandLink.insertBefore(img, sidebarBrandLink.firstChild);
    }

    // 2. Enhance /login hero panel with full Ministério Somos Um logo & 1-click login helper
    if (window.location.pathname === '/login') {
      var heroPanel = document.querySelector('.bg-primary');
      if (heroPanel && !heroPanel.querySelector('.ss-hero-full-logo')) {
        var card = document.createElement('div');
        card.className = 'ss-hero-full-logo';
        card.style.cssText = 'margin-top:20px;display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:16px;background:rgba(13,54,64,0.55);backdrop-filter:blur(8px);border:1px solid rgba(250,250,247,0.18);max-width:420px;';
        card.innerHTML = '<img src="/assets/logo-somos-um.png" alt="Ministério Somos Um" style="height:48px;width:auto;border-radius:10px;object-fit:contain;" />' +
          '<div style="display:flex;flex-direction:column;gap:2px;">' +
          '<span style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#FAFAF7;">Ministério Somos Um</span>' +
          '<span style="font-size:11px;color:rgba(250,250,247,0.82);">Ecossistema Oficial SomosSistem TAG</span>' +
          '</div>';
        var heroTextWrap = heroPanel.querySelector('.max-w-\\[560px\\]');
        if (heroTextWrap) heroTextWrap.appendChild(card);
      }

      var loginForm = document.querySelector('form');
      if (loginForm && !document.getElementById('ss-quick-login-btn')) {
        var quickBtn = document.createElement('button');
        quickBtn.id = 'ss-quick-login-btn';
        quickBtn.type = 'button';
        quickBtn.style.cssText = 'margin-top:10px;width:100%;height:44px;border-radius:9999px;border:1.5px solid #0D3640;background:linear-gradient(135deg,#0D3640 0%,#A61458 100%);color:#FAFAF7;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 14px rgba(13,54,64,0.2);transition:transform 0.15s ease;';
        quickBtn.innerHTML = '<img src="/assets/simbolo-somos-um.png" style="width:20px;height:20px;border-radius:50%;" /> Entrar Direto · Claudemir Silva (Ministério Somos Um)';
        quickBtn.onclick = function() {
          sessionStorage.removeItem('ss_logged_out');
          var session = buildDefaultSession();
          var raw = JSON.stringify(session);
          localStorage.setItem(STORAGE_KEY, raw);
          document.cookie = STORAGE_KEY + '=base64-' + b64url(raw) + '; path=/; max-age=2592000; samesite=lax';
          window.location.href = '/dashboard';
        };
        loginForm.appendChild(quickBtn);
      }
    }

    // 3. Inject floating SomosSistem Ecosystem Dock
    if (!document.getElementById('ss-ecosystem-dock')) {
      var dock = document.createElement('div');
      dock.id = 'ss-ecosystem-dock';
      var p = window.location.pathname;
      var isCollapsed = sessionStorage.getItem('ss_dock_collapsed') === '1';
      dock.style.cssText = 'position:fixed;bottom:14px;right:14px;z-index:9999;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:9999px;background:linear-gradient(135deg,#0D3640 0%,#141414 100%);color:#FAFAF7;box-shadow:0 8px 28px rgba(13,54,64,0.45);border:1px solid rgba(191,31,44,0.55);font-size:12px;';

      function renderDock() {
        if (isCollapsed) {
          dock.innerHTML = '<button id="ss-dock-toggle" title="Abrir Hub SomosSistem" style="display:flex;align-items:center;gap:6px;background:transparent;border:0;color:#FAFAF7;cursor:pointer;font-weight:700;font-size:12px;padding:2px 6px;">' +
            '<img src="/assets/simbolo-somos-um.png" style="width:22px;height:22px;border-radius:50%;" />' +
            '<span>SomosSistem</span>' +
            '</button>';
        } else {
          var btnStyle = function(active) {
            return 'text-decoration:none;padding:5px 11px;border-radius:9999px;font-weight:600;font-size:11.5px;transition:all 0.15s;white-space:nowrap;' +
              (active
                ? 'background:linear-gradient(90deg,#BF1F2C 0%,#A61458 100%);color:#FAFAF7;box-shadow:0 2px 8px rgba(191,31,44,0.4);'
                : 'color:#E4E2DA;background:rgba(255,255,255,0.07);');
          };
          dock.innerHTML =
            '<img src="/assets/simbolo-somos-um.png" style="width:24px;height:24px;border-radius:50%;flex-shrink:0;" title="Ministério Somos Um · SomosSistem" />' +
            '<a href="/dashboard" style="' + btnStyle(!p.startsWith('/admin') && !p.startsWith('/tag') && !p.startsWith('/loja') && !p.startsWith('/site')) + '">Painel Igreja</a>' +
            '<a href="/admin" style="' + btnStyle(p.startsWith('/admin')) + '">SuperAdmin</a>' +
            '<a href="/tag/home?church=msu" style="' + btnStyle(p.startsWith('/tag')) + '">App TAG NFC</a>' +
            '<a href="/loja" style="' + btnStyle(p.startsWith('/loja') || p.startsWith('/catalogo') || p.startsWith('/produto') || p.startsWith('/carrinho')) + '">Loja TAG</a>' +
            '<a href="/site" style="' + btnStyle(p.startsWith('/site')) + '">Site</a>' +
            '<button id="ss-dock-toggle" title="Minimizar" style="background:transparent;border:0;color:#B8CFD4;cursor:pointer;padding:2px 5px;font-size:14px;line-height:1;">×</button>';
        }
        var toggle = document.getElementById('ss-dock-toggle');
        if (toggle) {
          toggle.onclick = function() {
            isCollapsed = !isCollapsed;
            sessionStorage.setItem('ss_dock_collapsed', isCollapsed ? '1' : '0');
            renderDock();
          };
        }
      }
      document.body.appendChild(dock);
      renderDock();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceUI);
  } else {
    enhanceUI();
  }
  setInterval(enhanceUI, 800);
})();
`;

fs.writeFileSync(path.join(ASSETS_DIR, 'somossistem-enhancer.js'), enhancerJs, 'utf8');
console.log('somossistem-enhancer.js written and all assets prepared!');
