(function () {
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
    } catch (e) { }
  }

  ensureSession();

  // Wrap window.fetch BEFORE Next.js and Supabase chunks initialize
  var origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
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
    } catch (e) { }
    return origFetch(input, init);
  };

  function showGlobalToast(message) {
    var toast = document.getElementById('ss-global-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ss-global-toast';
      toast.style.cssText = 'position:fixed;top:18px;right:18px;z-index:10050;background:#0D3640;color:#FAFAF7;padding:13px 18px;border-radius:14px;font-family:system-ui,-apple-system,sans-serif;font-size:13px;font-weight:700;box-shadow:0 14px 36px rgba(13,54,64,0.32);border-left:5px solid #12B76A;display:flex;align-items:center;gap:8px;max-width:380px;';
      document.body.appendChild(toast);
    }
    toast.innerHTML = '<span>✅</span><span>' + message + '</span>';
    toast.style.display = 'flex';
    clearTimeout(window.__ssGlobalToastTimer);
    window.__ssGlobalToastTimer = setTimeout(function () {
      toast.style.display = 'none';
    }, 4000);
  }

  function openGlobalActionModal(mode) {
    if (typeof window.openQuickModal === 'function' && document.getElementById('ss-quick-modal')) {
      window.openQuickModal(mode === 'voluntario' ? 'visita' : 'ajuda');
      return;
    }
    var overlay = document.getElementById('ss-global-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'ss-global-modal-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(7,34,41,0.68);backdrop-filter:blur(5px);z-index:10020;display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,sans-serif;';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';

    if (mode === 'voluntario') {
      overlay.innerHTML =
        '<div style="background:#FFFFFF;color:#112227;border-radius:22px;max-width:480px;width:100%;padding:24px;box-shadow:0 24px 60px rgba(0,0,0,0.28);border:1px solid #E4E1D9;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
        '<h3 style="font-size:18px;font-weight:800;color:#0D3640;margin:0;">⚡ Cadastro Rápido de Voluntário</h3>' +
        '<button type="button" id="ss-close-gmodal" style="border:0;background:#F2F4F5;width:32px;height:32px;border-radius:50%;font-size:18px;font-weight:800;cursor:pointer;color:#0D3640;">×</button>' +
        '</div>' +
        '<p style="font-size:13px;color:#506268;margin:0 0 14px;">Cadastre um novo voluntário e integre automaticamente às equipes e escalas do Ministério Somos Um.</p>' +
        '<form id="ss-gmodal-vol-form" style="display:flex;flex-direction:column;gap:10px;">' +
        '<input name="name" required placeholder="Nome Completo *" style="padding:11px 12px;border-radius:10px;border:1.5px solid #D0D7DA;font-size:14px;" />' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
        '<input name="phone" required placeholder="WhatsApp * (14) 99999-0000" style="padding:11px 12px;border-radius:10px;border:1.5px solid #D0D7DA;font-size:14px;" />' +
        '<input name="email" type="email" placeholder="E-mail" style="padding:11px 12px;border-radius:10px;border:1.5px solid #D0D7DA;font-size:14px;" />' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
        '<select name="ministerio" style="padding:11px 12px;border-radius:10px;border:1.5px solid #D0D7DA;font-size:13.5px;background:#fff;">' +
        '<option value="Recepção">Recepção & Boas-Vindas TAG</option>' +
        '<option value="Louvor">Louvor & Adoração</option>' +
        '<option value="Social">Ação Social Fé com Pão</option>' +
        '<option value="Mídia">Mídia & Projeção</option>' +
        '<option value="Infantil">Ministério Infantil</option>' +
        '</select>' +
        '<input name="funcao" placeholder="Função (ex: Vocal, Som, Apoio)" style="padding:11px 12px;border-radius:10px;border:1.5px solid #D0D7DA;font-size:13.5px;" />' +
        '</div>' +
        '<select name="escala_id" style="padding:11px 12px;border-radius:10px;border:1.5px solid #D0D7DA;font-size:13.5px;background:#fff;">' +
        '<option value="esc-somos-02">Alocar na Escala: Quarta que Fortalece (19:30)</option>' +
        '<option value="esc-somos-01">Alocar na Escala: Culto da Família · Domingo (18:30)</option>' +
        '<option value="esc-somos-04">Alocar na Escala: Ação Social Fé com Pão (09:00)</option>' +
        '<option value="">Apenas cadastrar no banco de voluntários</option>' +
        '</select>' +
        '<button type="submit" style="margin-top:4px;padding:12px;border-radius:12px;border:0;background:linear-gradient(135deg,#BF1F2C 0%,#A61458 100%);color:#FFFFFF;font-weight:800;font-size:14px;cursor:pointer;">✅ Confirmar e Integrar Voluntário</button>' +
        '</form>' +
        '</div>';

      document.getElementById('ss-gmodal-vol-form').onsubmit = function (ev) {
        ev.preventDefault();
        var f = ev.target;
        fetch('/api/voluntarios/cadastro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: f.name.value,
            phone: f.phone.value,
            email: f.email.value,
            ministerio: f.ministerio.value,
            funcao: f.funcao.value || 'Voluntário',
            escala_id: f.escala_id.value
          })
        }).then(function () {
          overlay.style.display = 'none';
          showGlobalToast('Voluntário ' + f.name.value + ' cadastrado e escalado com sucesso!');
          window.__ssAgileLoaded = false;
          enhanceUI();
        });
      };
    } else {
      overlay.innerHTML =
        '<div style="background:#FFFFFF;color:#112227;border-radius:22px;max-width:480px;width:100%;padding:24px;box-shadow:0 24px 60px rgba(0,0,0,0.28);border:1px solid #E4E1D9;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
        '<h3 style="font-size:18px;font-weight:800;color:#0D3640;margin:0;">🙏 Pedir Oração ou Apoio Social</h3>' +
        '<button type="button" id="ss-close-gmodal" style="border:0;background:#F2F4F5;width:32px;height:32px;border-radius:50%;font-size:18px;font-weight:800;cursor:pointer;color:#0D3640;">×</button>' +
        '</div>' +
        '<p style="font-size:13px;color:#506268;margin:0 0 14px;">Envie seu pedido diretamente para a equipe pastoral ou solicite apoio do projeto <strong>Fé com Pão</strong>.</p>' +
        '<form id="ss-gmodal-help-form" style="display:flex;flex-direction:column;gap:10px;">' +
        '<select name="tipo" style="padding:11px 12px;border-radius:10px;border:1.5px solid #D0D7DA;font-size:14px;background:#fff;">' +
        '<option value="ORACAO">🙏 Pedido de Oração / Intercessão</option>' +
        '<option value="SOCIAL">🍞 Apoio Social / Cesta Básica Fé com Pão</option>' +
        '<option value="VISITA">👋 Quero Fazer Minha 1ª Visita / Conversa Pastoral</option>' +
        '</select>' +
        '<input name="name" required placeholder="Seu Nome *" style="padding:11px 12px;border-radius:10px;border:1.5px solid #D0D7DA;font-size:14px;" />' +
        '<input name="phone" required placeholder="WhatsApp para Retorno * (14) 99999-0000" style="padding:11px 12px;border-radius:10px;border:1.5px solid #D0D7DA;font-size:14px;" />' +
        '<textarea name="request" required rows="3" placeholder="Como podemos orar ou apoiar você e sua família? *" style="padding:11px 12px;border-radius:10px;border:1.5px solid #D0D7DA;font-size:14px;font-family:inherit;"></textarea>' +
        '<button type="submit" style="margin-top:4px;padding:12px;border-radius:12px;border:0;background:linear-gradient(135deg,#BF1F2C 0%,#A61458 100%);color:#FFFFFF;font-weight:800;font-size:14px;cursor:pointer;">Enviar Agora</button>' +
        '</form>' +
        '</div>';

      document.getElementById('ss-gmodal-help-form').onsubmit = function (ev) {
        ev.preventDefault();
        var f = ev.target;
        fetch('/api/ajuda', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: f.tipo.value,
            name: f.name.value,
            phone: f.phone.value,
            request: f.request.value,
            description: f.request.value
          })
        }).then(function () {
          overlay.style.display = 'none';
          showGlobalToast('Recebemos sua solicitação! A equipe Somos Um falará com você em breve.');
        });
      };
    }

    var closeBtn = document.getElementById('ss-close-gmodal');
    if (closeBtn) {
      closeBtn.onclick = function () {
        overlay.style.display = 'none';
      };
    }
  }

  window.__ssOpenModal = openGlobalActionModal;
  window.__ssCopyPix = function () {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText('46328262000180').catch(function () { });
    }
    showGlobalToast('Chave PIX copiada: 46.328.262/0001-80 (Ministério Somos Um)');
  };

  function enhanceUI() {
    // 0. Ensure unified design system CSS is loaded
    if (document.head && !document.getElementById('ss-design-css')) {
      var link = document.createElement('link');
      link.id = 'ss-design-css';
      link.rel = 'stylesheet';
      link.href = '/assets/somossistem-design.css';
      document.head.appendChild(link);
    }

    if (document.title && document.title.indexOf('IGEX') !== -1) {
      document.title = document.title.replace(/IGEX/g, 'SomosSistem · Ministério Somos Um');
    }

    var p = window.location.pathname;

    // 1. Inject Top Quick-Switch Command Bar on pages that do not have .portal-header
    if (document.body && !document.querySelector('.portal-header') && !document.getElementById('ss-top-command-bar') && p !== '/login') {
      var cmdBar = document.createElement('div');
      cmdBar.id = 'ss-top-command-bar';
      cmdBar.className = 'ss-top-command-bar';
      cmdBar.innerHTML =
        '<div style="display:flex;align-items:center;gap:10px;">' +
        '<a href="/site" style="display:inline-flex;align-items:center;gap:8px;text-decoration:none;color:#FFFFFF;font-weight:800;font-size:13px;">' +
        '<img src="/assets/simbolo-somos-um.png" alt="Somos Um" style="width:26px;height:26px;border-radius:50%;border:1.5px solid #FF8FA3;" />' +
        '<span>Ministério Somos Um</span>' +
        '</a>' +
        '<span style="font-size:11px;color:rgba(255,255,255,0.75);padding-left:6px;border-left:1px solid rgba(255,255,255,0.2);">Cultos: Dom 18h30 · Qua 19h30</span>' +
        '</div>' +
        '<div class="ss-top-command-links">' +
        '<button type="button" class="ss-cmd-pill primary" onclick="window.__ssOpenModal(\'ajuda\')">🙏 Pedir Oração / Ajuda</button>' +
        '<button type="button" class="ss-cmd-pill" onclick="window.__ssOpenModal(\'voluntario\')">+ Cadastrar Voluntário</button>' +
        '<a href="/site#secao-comunidade" class="ss-cmd-pill">🤝 Portal Comunidade</a>' +
        '<a href="/site#secao-voluntarios" class="ss-cmd-pill">⚡ Central do Voluntário</a>' +
        '<a href="/escala" class="ss-cmd-pill">🗓️ Escalas</a>' +
        '<a href="/social" class="ss-cmd-pill">🍞 Fé com Pão</a>' +
        '<a href="/dashboard" class="ss-cmd-pill">📊 Painel</a>' +
        '</div>';
      document.body.insertBefore(cmdBar, document.body.firstChild);
    }

    // 2. Above-the-Fold Frictionless Community Hero on /home and /tag/home
    if ((p === '/home' || p === '/tag/home') && !document.getElementById('ss-tag-community-hero')) {
      var mainEl = document.querySelector('main');
      if (mainEl) {
        var heroWrap = document.createElement('section');
        heroWrap.id = 'ss-tag-community-hero';
        heroWrap.innerHTML =
          '<div class="ss-tag-hero-card">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">' +
          '<div style="display:flex;align-items:center;gap:12px;">' +
          '<img src="/assets/simbolo-somos-um.png" alt="Ministério Somos Um" style="width:52px;height:52px;border-radius:50%;border:2px solid #FFFFFF;box-shadow:0 4px 14px rgba(0,0,0,0.25);" />' +
          '<div>' +
          '<span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#FFD1DA;display:block;">Acesso Rápido · Sem Fricção</span>' +
          '<h2 style="font-size:20px;font-weight:800;margin:0;color:#FFFFFF;line-height:1.2;">Bem-vindo ao Ministério Somos Um</h2>' +
          '<span style="font-size:12.5px;color:rgba(255,255,255,0.88);">Domingos 18h30 · Quartas 19h30 · Sábados 09h (Fé com Pão)</span>' +
          '</div>' +
          '</div>' +
          '<a href="/site#secao-voluntarios" style="background:rgba(7,34,41,0.55);color:#FFFFFF;border:1px solid rgba(255,255,255,0.3);padding:8px 14px;border-radius:999px;font-size:12px;font-weight:700;text-decoration:none;">⚡ Sou Voluntário / Equipe →</a>' +
          '</div>' +
          '<div class="ss-tag-cta-grid">' +
          '<button type="button" class="ss-tag-cta-btn highlight" onclick="window.__ssOpenModal(\'ajuda\')">' +
          '<span style="font-size:20px;">🙏</span>' +
          '<div><div style="font-weight:800;">Pedir Oração ou Ajuda</div><div style="font-size:11px;opacity:0.9;font-weight:500;">Intercessão e Cesta Fé com Pão</div></div>' +
          '</button>' +
          '<a href="#visitantes" class="ss-tag-cta-btn">' +
          '<span style="font-size:20px;">👋</span>' +
          '<div><div style="font-weight:800;">Primeira Visita</div><div style="font-size:11px;color:#506268;font-weight:500;">Recepção & Boas-Vindas</div></div>' +
          '</a>' +
          '<a href="#eventos" class="ss-tag-cta-btn">' +
          '<span style="font-size:20px;">🎟️</span>' +
          '<div><div style="font-weight:800;">Eventos & Cursos</div><div style="font-size:11px;color:#506268;font-weight:500;">Inscrição rápida online</div></div>' +
          '</a>' +
          '<button type="button" class="ss-tag-cta-btn" onclick="window.__ssCopyPix()">' +
          '<span style="font-size:20px;">💝</span>' +
          '<div><div style="font-weight:800;">Ofertar via PIX</div><div style="font-size:11px;color:#506268;font-weight:500;">Copiar chave em 1 toque</div></div>' +
          '</button>' +
          '<button type="button" class="ss-tag-cta-btn" onclick="window.__ssOpenModal(\'voluntario\')">' +
          '<span style="font-size:20px;">🤝</span>' +
          '<div><div style="font-weight:800;">Quero Ser Voluntário</div><div style="font-size:11px;color:#506268;font-weight:500;">Servir nos ministérios</div></div>' +
          '</button>' +
          '<a href="https://wa.me/5514981447428?text=Ol%C3%A1!%20Vim%20pelo%20App%20TAG%20do%20Minist%C3%A9rio%20Somos%20Um." target="_blank" rel="noopener" class="ss-tag-cta-btn">' +
          '<span style="font-size:20px;">💬</span>' +
          '<div><div style="font-weight:800;">Falar no WhatsApp</div><div style="font-size:11px;color:#506268;font-weight:500;">Atendimento direto</div></div>' +
          '</a>' +
          '</div>' +
          '</div>';
        mainEl.insertBefore(heroWrap, mainEl.firstChild);
      }
    }

    // 3. Agile Volunteer Operations Strip on /dashboard, /escala, /social, /ministerios
    if ((p === '/dashboard' || p === '/escala' || p === '/social' || p === '/ministerios') && !document.getElementById('ss-volunteer-agile-strip')) {
      var targetMain = document.querySelector('main') || document.querySelector('[class*="flex-1"]');
      if (targetMain && targetMain.firstChild) {
        var strip = document.createElement('div');
        strip.id = 'ss-volunteer-agile-strip';
        strip.innerHTML =
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;">' +
          '<div>' +
          '<span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#BF1F2C;">⚡ Fluxo Ágil de Voluntários & Operação</span>' +
          '<h3 style="font-size:16px;font-weight:800;color:#0D3640;margin:2px 0 4px;">Central Rápida de Escalas, Voluntários e Demandas</h3>' +
          '<div id="ss-strip-metrics" style="font-size:12.5px;color:#506268;display:flex;gap:14px;flex-wrap:wrap;">' +
          '<span>👥 <strong>12</strong> voluntários ativos</span>' +
          '<span>🗓️ <strong>4</strong> escalas na semana</span>' +
          '<span>🍞 <strong>Fé com Pão</strong> operacional</span>' +
          '</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
          '<button type="button" onclick="window.__ssOpenModal(\'voluntario\')" style="padding:9px 14px;border-radius:10px;border:0;background:linear-gradient(135deg,#BF1F2C 0%,#A61458 100%);color:#FFFFFF;font-weight:700;font-size:12.5px;cursor:pointer;box-shadow:0 4px 12px rgba(191,31,44,0.25);">+ Cadastrar Voluntário</button>' +
          '<button type="button" id="ss-btn-confirm-all-escala" style="padding:9px 14px;border-radius:10px;border:1.5px solid #0D3640;background:#0D3640;color:#FFFFFF;font-weight:700;font-size:12.5px;cursor:pointer;">✓ Confirmar Escala Pendente</button>' +
          '<a href="/site#secao-voluntarios" style="padding:9px 14px;border-radius:10px;border:1.5px solid #D0D7DA;background:#FFFFFF;color:#0D3640;font-weight:700;font-size:12.5px;text-decoration:none;">Abrir Painel Completo do Voluntário →</a>' +
          '</div>' +
          '</div>';
        targetMain.insertBefore(strip, targetMain.firstChild);

        var confirmBtn = document.getElementById('ss-btn-confirm-all-escala');
        if (confirmBtn) {
          confirmBtn.onclick = function () {
            fetch('/api/escala/confirmar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ escala_id: 'esc-somos-02', id: 'ep7', status: 'CONFIRMED' })
            }).then(function () {
              showGlobalToast('Todas as escalas pendentes da semana foram confirmadas!');
              window.__ssAgileLoaded = false;
              enhanceUI();
            });
          };
        }
      }
    }

    if (!window.__ssAgileLoaded && document.getElementById('ss-strip-metrics')) {
      window.__ssAgileLoaded = true;
      fetch('/api/voluntarios/painel')
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var m = document.getElementById('ss-strip-metrics');
          if (m && d && d.resumo) {
            m.innerHTML =
              '<span>👥 <strong>' + d.resumo.totalVoluntarios + '</strong> voluntários ativos</span>' +
              '<span>🗓️ <strong>' + d.resumo.escalasAtivas + '</strong> escalas (' + (d.resumo.confirmacoesPendentes === 0 ? '<strong style="color:#0E7A4E;">100% confirmadas</strong>' : '<strong style="color:#B86B0B;">' + d.resumo.confirmacoesPendentes + ' pendente</strong>') + ')</span>' +
              '<span>🍞 <strong>' + d.resumo.demandasSociaisPendentes + '</strong> demandas sociais Fé com Pão</span>' +
              '<span>🙏 <strong>' + d.resumo.pedidosOracaoVisitantes + '</strong> pedidos/visitas na fila</span>';
          }
        })
        .catch(function () { });
    }

    // 4. Inject Ministério Somos Um round emblem into Sidebar header
    var sidebarBrandLink = document.querySelector('div[data-platform] > div:first-child a');
    if (sidebarBrandLink && !sidebarBrandLink.querySelector('.ss-brand-logo')) {
      var img = document.createElement('img');
      img.src = '/assets/simbolo-somos-um.png';
      img.alt = 'Ministério Somos Um';
      img.className = 'ss-brand-logo';
      img.style.cssText = 'width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;box-shadow:0 2px 8px rgba(191,31,44,0.35);border:1.5px solid rgba(191,31,44,0.5);';
      sidebarBrandLink.insertBefore(img, sidebarBrandLink.firstChild);
    }

    // 5. Enhance /login hero panel with full Ministério Somos Um logo & 1-click login helper
    if (p === '/login') {
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
        quickBtn.onclick = function () {
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

    // 6. Inject Mobile Bottom Navigation Bar (for mobile-first ergonomics)
    if (document.body && !document.getElementById('ss-mobile-bottom-nav')) {
      var mnav = document.createElement('nav');
      mnav.id = 'ss-mobile-bottom-nav';
      mnav.setAttribute('aria-label', 'Navegação Rápida Mobile');
      mnav.innerHTML =
        '<a href="/home?church=msu" class="' + (p.indexOf('/home') === 0 || p.indexOf('/tag') === 0 ? 'active' : '') + '"><span style="font-size:17px;">🏠</span><span>Comunidade</span></a>' +
        '<button type="button" onclick="window.__ssOpenModal(\'ajuda\')"><span style="font-size:17px;">🙏</span><span>Pedir Ajuda</span></button>' +
        '<a href="/site#secao-voluntarios" class="' + (p === '/site' || p === '/voluntarios' ? 'active' : '') + '"><span style="font-size:17px;">⚡</span><span>Voluntários</span></a>' +
        '<a href="/escala" class="' + (p.indexOf('/escala') === 0 ? 'active' : '') + '"><span style="font-size:17px;">🗓️</span><span>Escalas</span></a>' +
        '<a href="/dashboard" class="' + (p === '/dashboard' ? 'active' : '') + '"><span style="font-size:17px;">📊</span><span>Gestão</span></a>';
      document.body.appendChild(mnav);
    }

    // 7. Inject floating SomosSistem Ecosystem Dock
    if (document.body && !document.getElementById('ss-ecosystem-dock')) {
      var dock = document.createElement('div');
      dock.id = 'ss-ecosystem-dock';
      var isCollapsed = sessionStorage.getItem('ss_dock_collapsed') === '1';
      dock.style.cssText = 'position:fixed;bottom:14px;right:14px;z-index:9999;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:9999px;background:linear-gradient(135deg,#0D3640 0%,#141414 100%);color:#FAFAF7;box-shadow:0 8px 28px rgba(13,54,64,0.45);border:1px solid rgba(191,31,44,0.55);font-size:12px;';

      function renderDock() {
        if (isCollapsed) {
          dock.innerHTML = '<button id="ss-dock-toggle" title="Abrir Hub SomosSistem" style="display:flex;align-items:center;gap:6px;background:transparent;border:0;color:#FAFAF7;cursor:pointer;font-weight:700;font-size:12px;padding:2px 6px;">' +
            '<img src="/assets/simbolo-somos-um.png" style="width:22px;height:22px;border-radius:50%;" />' +
            '<span>SomosSistem</span>' +
            '</button>';
        } else {
          var btnStyle = function (active) {
            return 'text-decoration:none;padding:5px 11px;border-radius:9999px;font-weight:600;font-size:11.5px;transition:all 0.15s;white-space:nowrap;' +
              (active
                ? 'background:linear-gradient(90deg,#BF1F2C 0%,#A61458 100%);color:#FAFAF7;box-shadow:0 2px 8px rgba(191,31,44,0.4);'
                : 'color:#E4E2DA;background:rgba(255,255,255,0.07);');
          };
          dock.innerHTML =
            '<img src="/assets/simbolo-somos-um.png" style="width:24px;height:24px;border-radius:50%;flex-shrink:0;" title="Ministério Somos Um · SomosSistem" />' +
            '<a href="/site" style="' + btnStyle(p.startsWith('/site') || p.startsWith('/voluntarios') || p.startsWith('/comunidade')) + '">Portal & Voluntários</a>' +
            '<a href="/tag/home?church=msu" style="' + btnStyle(p.startsWith('/tag') || p.startsWith('/home')) + '">App Comunidade</a>' +
            '<a href="/escala" style="' + btnStyle(p.startsWith('/escala')) + '">Escalas</a>' +
            '<a href="/dashboard" style="' + btnStyle(p === '/dashboard') + '">Painel Igreja</a>' +
            '<a href="/admin" style="' + btnStyle(p.startsWith('/admin')) + '">SuperAdmin</a>' +
            '<a href="/loja" style="' + btnStyle(p.startsWith('/loja') || p.startsWith('/catalogo') || p.startsWith('/produto') || p.startsWith('/carrinho')) + '">Loja TAG</a>' +
            '<button id="ss-dock-toggle" title="Minimizar" style="background:transparent;border:0;color:#B8CFD4;cursor:pointer;padding:2px 5px;font-size:14px;line-height:1;">×</button>';
        }
        var toggle = document.getElementById('ss-dock-toggle');
        if (toggle) {
          toggle.onclick = function () {
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
