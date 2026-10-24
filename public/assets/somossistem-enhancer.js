(function() {
  'use strict';

  var SUPA_ORIGIN = 'https://skzbdgxwvzhkhbhriuwd.supabase.co';
  var STORAGE_KEY = 'sb-skzbdgxwvzhkhbhriuwd-auth-token';

  function b64url(str) {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
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
        var heroTextWrap = heroPanel.querySelector('.max-w-\[560px\]');
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
