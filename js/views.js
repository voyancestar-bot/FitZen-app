// Fonctions de rendu : chacune retourne une string HTML pour une vue donnée.

function videoCard(v) {
  const locked = !Store.hasAccess(v.id, v.free);
  const media = VIDEO_MEDIA[v.id];
  return `
    <a class="card" href="#/videos/${v.id}">
      <div class="thumb ${v.color}">
        ${media ? `<img src="${media.thumbnail}" alt="" loading="lazy" />` : `<span>${v.icon}</span>`}
        <div class="thumb-overlay">
          ${badge(v.free)}
          ${favBtn(v.id)}
        </div>
        <span class="duration">${locked ? "🔒 " : "▶ "}${v.duration}</span>
      </div>
      <div class="card-body">
        <span class="card-cat">${v.category}</span>
        <span class="card-title">${v.title}</span>
        <div class="card-meta"><span>${v.level}</span></div>
      </div>
    </a>`;
}

function audioCard(a) {
  const locked = !Store.hasAccess(a.id, a.free);
  return `
    <a class="card" href="#/audios/${a.id}">
      <div class="thumb ${a.color}">
        <span>${a.icon}</span>
        <div class="thumb-overlay">
          ${badge(a.free)}
          ${favBtn(a.id)}
        </div>
        <span class="duration">${locked ? "🔒 " : "🎧 "}${a.duration}</span>
      </div>
      <div class="card-body">
        <span class="card-cat">${a.category}</span>
        <span class="card-title">${a.title}</span>
      </div>
    </a>`;
}

function articleCard(r) {
  return `
    <a class="card" href="#/articles/${r.id}">
      <div class="thumb ${r.color}">
        <span>${r.icon}</span>
        <div class="thumb-overlay">
          ${badge(r.free)}
          ${favBtn(r.id)}
        </div>
        <span class="duration">${r.readTime} de lecture</span>
      </div>
      <div class="card-body">
        <span class="card-cat">${r.category}</span>
        <span class="card-title">${r.title}</span>
        <p class="card-excerpt">${r.excerpt}</p>
      </div>
    </a>`;
}

function paywallBlock(kind, item, previewEnded) {
  const label = kind === "video" ? "cette vidéo" : kind === "audio" ? "cet audio" : "cet article";
  const heading = previewEnded ? "🔒 Aperçu gratuit terminé" : "🔒 Contenu Premium";
  const text = previewEnded
    ? `Tu as vu les 30 premières secondes. Abonne-toi pour continuer ${label} en entier, ou paye uniquement cette séance.`
    : `Abonnez-vous pour débloquer ${label} et tout le catalogue FitZen, ou payez uniquement cette séance.`;
  return `
    <div class="paywall grad-6">
      <div class="paywall-content">
        <h3>${heading}</h3>
        <p>${text}</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center;">
          <a href="#/abonnement" class="btn btn-primary">Voir les abonnements</a>
          <button class="btn btn-secondary" data-action="buy-session" data-type="${kind}" data-id="${item.id}" data-title="${escapeHtml(item.title)}">Payer 3€ cette séance</button>
        </div>
      </div>
    </div>`;
}

/* ---------- HOME ---------- */
function renderHome() {
  const freeVideos = VIDEOS.filter(v => v.free).slice(0, 3);
  const freeAudios = AUDIOS.filter(a => a.free).slice(0, 2);
  return `
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="container hero-content">
        <div class="eyebrow">Bouge, respire, progresse</div>
        <h1>Ton coach fitness &amp; bien-être, où que tu sois.</h1>
        <p>Vidéos d'entraînement, audios de relaxation et articles pour t'accompagner au quotidien. Commence gratuitement, débloque tout avec l'abonnement.</p>
        <div class="hero-actions">
          <a href="#/videos" class="btn btn-primary btn-lg">Explorer les vidéos</a>
          <a href="#/abonnement" class="btn btn-secondary btn-lg">Voir l'abonnement</a>
        </div>
        <div class="stats-row">
          <div class="stat"><b>${VIDEOS.length}+</b><span>Vidéos d'entraînement</span></div>
          <div class="stat"><b>${AUDIOS.length}+</b><span>Audios de relaxation</span></div>
          <div class="stat"><b>${ARTICLES.length}+</b><span>Articles à lire</span></div>
        </div>
      </div>
    </section>

    <div class="container">
      <section class="section">
        <div class="section-head">
          <div><h2>🎬 Vidéos populaires</h2><p>Entraîne-toi n'importe où, sans matériel.</p></div>
          <a class="see-all" href="#/videos">Voir tout →</a>
        </div>
        <div class="grid">${freeVideos.map(videoCard).join("")}</div>
      </section>

      <section class="section">
        <div class="section-head">
          <div><h2>🎧 Détente &amp; relaxation</h2><p>Méditation, respiration, sons apaisants.</p></div>
          <a class="see-all" href="#/audios">Voir tout →</a>
        </div>
        <div class="grid">${freeAudios.map(audioCard).join("")}</div>
      </section>

      <section class="section">
        <div class="section-head">
          <div><h2>📖 À lire</h2><p>Nutrition, motivation, récupération.</p></div>
          <a class="see-all" href="#/articles">Voir tout →</a>
        </div>
        <div class="grid">${ARTICLES.slice(0, 3).map(articleCard).join("")}</div>
      </section>

      <section class="section" style="text-align:center; padding: 50px 0 70px;">
        <h2 style="font-size:1.8rem;">Prêt à passer au niveau supérieur ?</h2>
        <p style="color:var(--text-dim); max-width:480px; margin: 8px auto 22px;">Accède à l'intégralité du catalogue : toutes les vidéos, tous les audios, tous les articles.</p>
        <a href="#/abonnement" class="btn btn-primary btn-lg">Découvrir les abonnements</a>
      </section>
    </div>`;
}

/* ---------- LISTS ---------- */
function categoryFilters(items, activeCat) {
  const cats = ["Tous", ...Array.from(new Set(items.map(i => i.category)))];
  return `<div class="filters">${cats.map(c => `
    <button class="filter-chip ${c === activeCat ? "active" : ""}" data-action="filter" data-cat="${c}">${c}</button>
  `).join("")}</div>`;
}

let currentFilter = "Tous";

function renderVideosList() {
  const filtered = currentFilter === "Tous" ? VIDEOS : VIDEOS.filter(v => v.category === currentFilter);
  return `
    <div class="container section">
      <div class="section-head">
        <div><h2>🎬 Vidéos d'entraînement</h2><p>${VIDEOS.filter(v=>v.free).length} vidéos gratuites, le reste en Premium.</p></div>
      </div>
      <div class="demo-notice">🎥 Cours complets réels (20 à 35 min) — pas d'extraits ni de boucle.</div>
      ${categoryFilters(VIDEOS, currentFilter)}
      <div class="grid">${filtered.map(videoCard).join("") || emptyState()}</div>
    </div>`;
}

function renderAudiosList() {
  const filtered = currentFilter === "Tous" ? AUDIOS : AUDIOS.filter(a => a.category === currentFilter);
  return `
    <div class="container section">
      <div class="section-head">
        <div><h2>🎧 Audios de relaxation</h2><p>Méditation, sommeil, respiration, sons de la nature.</p></div>
      </div>
      ${categoryFilters(AUDIOS, currentFilter)}
      <div class="grid">${filtered.map(audioCard).join("") || emptyState()}</div>
    </div>`;
}

function renderArticlesList() {
  const filtered = currentFilter === "Tous" ? ARTICLES : ARTICLES.filter(r => r.category === currentFilter);
  return `
    <div class="container section">
      <div class="section-head">
        <div><h2>📖 Articles</h2><p>Conseils nutrition, mental, récupération et motivation.</p></div>
      </div>
      ${categoryFilters(ARTICLES, currentFilter)}
      <div class="grid">${filtered.map(articleCard).join("") || emptyState()}</div>
    </div>`;
}

function emptyState() {
  return `<div class="empty-state"><div class="emoji">🔍</div>Aucun contenu dans cette catégorie.</div>`;
}

/* ---------- DETAILS ---------- */
function renderVideoDetail(id) {
  const v = VIDEOS.find(x => x.id === id);
  if (!v) return notFound();
  const unlocked = Store.hasAccess(v.id, v.free);
  const media = VIDEO_MEDIA[id];
  const hostId = `ytvideo-${v.id}`;

  const controlsHtml = `
    <div class="video-poster" data-video-poster="${hostId}" data-action="video-toggle" style="background-image:url('${media ? media.thumbnail : ""}')">
      <span class="video-poster-play">▶</span>
    </div>
    <div class="video-bigplay" data-video-bigplay="${hostId}" data-action="video-toggle">▶</div>
    <div class="video-top-mask"></div>
    <div class="video-bottom-mask"></div>
    <div class="video-controls-bar">
      <button class="video-play-btn" data-video-playbtn="${hostId}" data-action="video-toggle">▶</button>
      <span class="video-time" data-video-current="${hostId}">0:00</span>
      <input type="range" class="video-seek" min="0" max="100" value="0" data-video-seek="${hostId}" data-action="video-seek" data-host="${hostId}" />
      <span class="video-time" data-video-durationlabel="${hostId}">--:--</span>
    </div>`;

  let playerHtml;
  if (!media) {
    playerHtml = `<div class="paywall ${v.color}"><div class="paywall-content"><h3>${v.icon} Vidéo indisponible</h3><p>Ce contenu n'a pas pu être chargé.</p></div></div>`;
  } else if (unlocked) {
    playerHtml = `<div class="player-wrap youtube-wrap"><div id="${hostId}" class="yt-video-host"></div>${controlsHtml}</div>`;
  } else {
    playerHtml = `
      <div class="player-wrap youtube-wrap preview-wrap">
        <div id="${hostId}" class="yt-video-host"></div>
        ${controlsHtml}
        <div class="preview-overlay" data-preview-overlay>${paywallBlock("video", v, true)}</div>
      </div>`;
  }

  return `
    <div class="container section">
      <a href="#/videos" class="see-all">← Toutes les vidéos</a>
      <div class="detail-hero" style="margin-top:16px;">
        ${playerHtml}
      </div>
      <div>
        ${badge(v.free)}
        <h1 class="detail-title">${v.title}</h1>
        <div class="detail-meta">
          <span>⏱ ${v.duration}</span><span>📈 ${v.level}</span><span>🏷 ${v.category}</span>
          ${favBtn(v.id)}
        </div>
        <p class="detail-desc">${v.description}</p>
      </div>
      ${commentsSection("video", v.id)}
    </div>`;
}

function renderAudioDetail(id) {
  const a = AUDIOS.find(x => x.id === id);
  if (!a) return notFound();
  const unlocked = Store.hasAccess(a.id, a.free);
  const media = AUDIO_MEDIA[id];
  const hostId = `ytaudio-${a.id}`;
  return `
    <div class="container section">
      <a href="#/audios" class="see-all">← Tous les audios</a>
      <div class="detail-hero" style="margin-top:16px;">
        ${!media
          ? `<div class="paywall ${a.color}"><div class="paywall-content"><h3>${a.icon} Audio indisponible</h3><p>Ce contenu n'a pas pu être chargé.</p></div></div>`
          : `<div class="audio-player ${a.color}">
                <div id="${hostId}" class="audio-yt-host"></div>
                <div class="audio-cover"><span>${a.icon}</span></div>
                <button class="audio-play-btn" data-audio-playbtn="${hostId}" data-action="audio-toggle">▶</button>
                <div class="audio-progress-row">
                  <span class="audio-time" data-audio-current="${hostId}">0:00</span>
                  <input type="range" class="audio-seek" min="0" max="100" value="0" data-audio-seek="${hostId}" data-action="audio-seek" data-host="${hostId}" />
                  <span class="audio-time" data-audio-durationlabel="${hostId}">--:--</span>
                </div>
                ${!unlocked ? `<div class="audio-preview-overlay" data-preview-overlay>${paywallBlock("audio", a, true)}</div>` : ""}
              </div>`}
      </div>
      <div>
        ${badge(a.free)}
        <h1 class="detail-title">${a.title}</h1>
        <div class="detail-meta">
          <span>⏱ ${a.duration}</span><span>🏷 ${a.category}</span>
          ${favBtn(a.id)}
        </div>
        <p class="detail-desc">${a.description}</p>
      </div>
      ${commentsSection("audio", a.id)}
    </div>`;
}

function renderArticleDetail(id) {
  const r = ARTICLES.find(x => x.id === id);
  if (!r) return notFound();
  const unlocked = Store.hasAccess(r.id, r.free);
  return `
    <div class="container section">
      <a href="#/articles" class="see-all">← Tous les articles</a>
      <div style="margin: 16px 0;">
        ${badge(r.free)}
        <h1 class="detail-title">${r.title}</h1>
        <div class="detail-meta"><span>⏱ ${r.readTime} de lecture</span><span>🏷 ${r.category}</span>${favBtn(r.id)}</div>
      </div>
      ${unlocked
        ? `<div class="article-content">${escapeHtml(r.content)}</div>`
        : `<div class="detail-hero">${paywallBlock("article", r)}</div><p class="detail-desc">${r.excerpt}</p>`}
      ${commentsSection("article", r.id)}
    </div>`;
}

/* ---------- COMMENTAIRES ---------- */

function formatCommentDate(iso) {
  try {
    const d = new Date(iso.replace(" ", "T") + "Z");
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch (e) {
    return "";
  }
}

function commentItem(c) {
  const initial = (c.user_name || "?").trim().charAt(0).toUpperCase();
  const mine = Store.state.user && Store.state.user.name === c.user_name;
  return `
    <div class="comment-item" data-comment-id="${c.id}">
      <div class="comment-avatar">${initial}</div>
      <div class="comment-body">
        <div class="comment-meta"><strong>${escapeHtml(c.user_name)}</strong><span>${formatCommentDate(c.created_at)}</span></div>
        <p class="comment-text">${escapeHtml(c.text)}</p>
      </div>
      ${mine ? `<button class="comment-delete" data-action="delete-comment" data-comment-id="${c.id}" title="Supprimer">✕</button>` : ""}
    </div>`;
}

function commentsSection(contentType, contentId) {
  const loggedIn = Store.isLoggedIn;
  return `
    <div class="comments-section" data-comments-for="${contentType}:${contentId}">
      <h2 class="comments-title">💬 Commentaires</h2>
      ${loggedIn
        ? `<div class="comment-form">
             <textarea class="comment-input" id="comment-input" placeholder="Écris un commentaire..." maxlength="1000"></textarea>
             <button class="btn btn-primary" data-action="submit-comment" data-content-type="${contentType}" data-content-id="${contentId}">Publier</button>
           </div>`
        : `<p class="comment-login-hint"><a href="#/compte">Connecte-toi</a> pour laisser un commentaire.</p>`}
      <div class="comments-list" data-comments-list>
        <p class="comments-empty">Chargement…</p>
      </div>
    </div>`;
}

/* ---------- CONTACT ---------- */

function renderContact() {
  const user = Store.state.user;
  return `
    <div class="container section" style="max-width:560px;">
      <h1 class="detail-title">Nous contacter</h1>
      <p class="detail-desc">Une question, un souci technique, une suggestion ? Écris-nous, on te répond par email.</p>
      <div class="contact-form">
        <label class="form-label">Nom</label>
        <input type="text" id="contact-name" class="form-input" value="${user ? escapeHtml(user.name) : ""}" placeholder="Ton nom" />
        <label class="form-label">Email</label>
        <input type="email" id="contact-email" class="form-input" value="${user ? escapeHtml(user.email) : ""}" placeholder="ton@email.com" />
        <label class="form-label">Message</label>
        <textarea id="contact-message" class="comment-input" style="min-height:140px;" placeholder="Ton message..." maxlength="4000"></textarea>
        <div id="contact-error" class="form-error" style="display:none;"></div>
        <button class="btn btn-primary" data-action="send-contact" style="margin-top:12px;">Envoyer</button>
      </div>
    </div>`;
}

function notFound() {
  return `<div class="container"><div class="empty-state"><div class="emoji">🚫</div>Contenu introuvable.<br><a class="see-all" href="#/">Retour à l'accueil</a></div></div>`;
}

/* ---------- SUBSCRIPTION ---------- */
let selectedPlan = "annual";

function renderSubscription() {
  const sub = Store.state.subscription;
  const stripeOn = APP_CONFIG.stripeConfigured;
  return `
    <div class="container section" style="text-align:center;">
      <div class="eyebrow" style="text-align:center;">Abonnement FitZen</div>
      <h1 style="font-size:2.2rem; margin: 0 0 10px;">Débloque tout le contenu</h1>
      <p style="color:var(--text-dim); max-width:520px; margin: 0 auto 28px;">Accès illimité à toutes les vidéos, audios et articles. Annulable à tout moment.</p>

      <div class="demo-notice" style="max-width:520px; margin:0 auto 20px; justify-content:center;">
        ${stripeOn
          ? "🔒 Paiement réel sécurisé via Stripe Checkout — tu seras redirigé vers la page de paiement officielle Stripe."
          : "⚠️ Stripe n'est pas encore configuré côté serveur : mode démo actif, aucun paiement réel. Voir <code>server/README.md</code>."}
      </div>

      ${sub && Store.isSubscribed ? `
        <div class="demo-notice" style="max-width:480px; margin:0 auto 28px; justify-content:center;">
          ✅ Abonnement ${PLANS[sub.plan].label}${sub.live ? " (Stripe)" : " (démo)"} actif jusqu'au ${new Date(sub.expiresAt).toLocaleDateString("fr-FR")}${sub.cancelAtPeriodEnd ? " — annulation programmée à cette date" : ""}.
        </div>` : ""}

      <div class="pricing-toggle">
        <button class="${selectedPlan === "monthly" ? "active" : ""}" data-action="select-plan" data-plan="monthly">Mensuel</button>
        <button class="${selectedPlan === "annual" ? "active" : ""}" data-action="select-plan" data-plan="annual">Annuel <span class="save-pill">-33%</span></button>
      </div>

      <div class="pricing-grid">
        <div class="plan-card ${selectedPlan === "monthly" ? "featured" : ""}">
          <div class="plan-name">Mensuel</div>
          <div class="plan-price">${formatPrice(PLANS.monthly.price)} <span>/mois</span></div>
          <ul class="plan-features">
            <li>Toutes les vidéos (illimité)</li>
            <li>Tous les audios de relaxation</li>
            <li>Tous les articles</li>
            <li>Sans engagement</li>
          </ul>
          <button class="btn btn-primary btn-block" data-action="subscribe" data-plan="monthly">Choisir le mensuel</button>
        </div>
        <div class="plan-card ${selectedPlan === "annual" ? "featured" : ""}">
          <div class="plan-name">Annuel</div>
          <div class="plan-price">${formatPrice(PLANS.annual.price)} <span>/an</span></div>
          <div class="plan-note">${PLANS.annual.note}</div>
          <ul class="plan-features">
            <li>Toutes les vidéos (illimité)</li>
            <li>Tous les audios de relaxation</li>
            <li>Tous les articles</li>
            <li>2 mois offerts vs mensuel</li>
          </ul>
          <button class="btn btn-primary btn-block" data-action="subscribe" data-plan="annual">Choisir l'annuel</button>
        </div>
      </div>

      <div class="free-card">
        Tu peux aussi continuer avec l'offre gratuite, ou payer <b>3€ à la séance</b> uniquement pour le contenu premium qui t'intéresse — le bouton apparaît directement sur chaque vidéo, audio ou article verrouillé.
      </div>

      ${sub && Store.isSubscribed && !sub.cancelAtPeriodEnd ? `
        <div style="margin-top:24px;">
          <button class="btn btn-danger" data-action="cancel-sub">Annuler mon abonnement</button>
        </div>` : ""}
    </div>`;
}

/* ---------- ACCOUNT ---------- */
let authMode = "login"; // "login" ou "register"

function renderAccount() {
  const u = Store.state.user;
  const sub = Store.state.subscription;
  if (!u) {
    const isRegister = authMode === "register";
    return `
      <div class="container section">
        <h1 class="detail-title">Mon compte</h1>
        <p class="detail-desc" style="margin-bottom:20px;">Connecte-toi pour sauvegarder tes favoris et ton statut d'abonnement.</p>
        <div class="account-card">
          <div class="auth-tabs">
            <button class="auth-tab ${!isRegister ? "active" : ""}" data-action="auth-mode" data-mode="login">Se connecter</button>
            <button class="auth-tab ${isRegister ? "active" : ""}" data-action="auth-mode" data-mode="register">Créer un compte</button>
          </div>

          <div id="google-signin-btn" class="google-signin-slot"></div>
          <div class="auth-divider"><span>ou</span></div>

          ${isRegister ? `
          <div class="form-field">
            <label>Prénom</label>
            <input type="text" id="acc-name" placeholder="Ex. Camille" />
          </div>` : ""}
          <div class="form-field">
            <label>Email</label>
            <input type="email" id="acc-email" placeholder="camille@example.com" />
            <p class="form-error" id="acc-email-error" style="display:none;"></p>
          </div>
          <div class="form-field">
            <label>Mot de passe</label>
            <input type="password" id="acc-password" placeholder="${isRegister ? "8 caractères minimum" : "••••••••"}" />
            <p class="form-error" id="acc-password-error" style="display:none;"></p>
          </div>
          <button class="btn btn-primary btn-block" data-action="${isRegister ? "register" : "login-password"}">${isRegister ? "Créer mon compte" : "Se connecter"}</button>
        </div>
      </div>`;
  }
  return `
    <div class="container section">
      <h1 class="detail-title">Mon compte</h1>
      <div class="account-card">
        <div class="status-row"><span>Nom</span><b>${escapeHtml(u.name)}</b></div>
        <div class="status-row"><span>Email</span><b>${escapeHtml(u.email)}</b></div>
        <div class="status-row">
          <span>Abonnement</span>
          <b>${Store.isSubscribed ? `${PLANS[sub.plan].label} ✅` : "Aucun (offre gratuite)"}</b>
        </div>
        ${Store.isSubscribed ? `<div class="status-row"><span>Valide jusqu'au</span><b>${new Date(sub.expiresAt).toLocaleDateString("fr-FR")}</b></div>` : ""}
        <div class="status-row"><span>Séances achetées à l'unité</span><b>${Store.state.purchasedItems.length}</b></div>
        <div class="status-row"><span>Favoris</span><b>${Store.state.favorites.length}</b></div>
      </div>
      <div style="display:flex; gap:10px; margin-top:18px; flex-wrap:wrap;">
        ${!Store.isSubscribed ? `<a href="#/abonnement" class="btn btn-primary">S'abonner</a>` : ""}
        <button class="btn btn-ghost" data-action="logout">Se déconnecter</button>
      </div>

      ${Store.state.favorites.length ? `
        <div class="section">
          <div class="section-head"><h2>Mes favoris</h2></div>
          <div class="grid">${Store.state.favorites.map(id => {
            const item = findContent(id);
            if (!item) return "";
            if (VIDEOS.includes(item)) return videoCard(item);
            if (AUDIOS.includes(item)) return audioCard(item);
            return articleCard(item);
          }).join("")}</div>
        </div>` : ""}
    </div>`;
}
