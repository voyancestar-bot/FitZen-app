const NAV_ITEMS = [
  { path: "#/", label: "Accueil" },
  { path: "#/videos", label: "Vidéos" },
  { path: "#/audios", label: "Audios" },
  { path: "#/articles", label: "Articles" },
  { path: "#/abonnement", label: "Abonnement" },
  { path: "#/compte", label: "Compte" }
];

// ---------- Thème clair/sombre (bascule manuelle) ----------

function getTheme() {
  return localStorage.getItem("fitzen_theme") || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("fitzen_theme", theme);
}

applyTheme(getTheme());

function renderHeader() {
  const hash = location.hash || "#/";
  const base = "#/" + (hash.split("/")[1] || "").split("?")[0];
  return `
    <header class="site-header">
      <div class="container header-inner">
        <a href="#/" class="logo"><span class="dot">●</span> FitZen</a>
        <button class="nav-toggle" data-action="toggle-nav">☰</button>
        <nav class="nav-links" id="nav-links">
          ${NAV_ITEMS.map(item => `
            <a class="nav-link ${base === item.path || (item.path === "#/" && base === "#/") ? "active" : ""}" href="${item.path}">${item.label}</a>
          `).join("")}
        </nav>
        <div class="header-actions">
          <button class="theme-toggle" data-action="toggle-theme" title="Changer de thème">${getTheme() === "light" ? "🌙" : "☀️"}</button>
          ${Store.isSubscribed
            ? `<span class="badge badge-premium">★ Premium</span>`
            : Store.isLoggedIn
              ? `<a href="#/abonnement" class="btn btn-primary">S'abonner</a>`
              : `<a href="#/compte" class="btn btn-primary">Se connecter</a>`}
        </div>
      </div>
    </header>`;
}

function renderFooter() {
  return `
    <footer class="site-footer">
      <div class="container footer-inner">
        <div>© ${new Date().getFullYear()} FitZen — Bouge, respire, progresse.</div>
        <div class="footer-right">
          <a href="#/contact" class="footer-link">Nous contacter</a>
          <span>${APP_CONFIG.stripeConfigured ? "Paiement sécurisé par Stripe" : "App de démonstration · Aucun paiement réel"}</span>
        </div>
      </div>
    </footer>`;
}

function parseHash() {
  const hash = (location.hash || "#/").slice(2); // enlève "#/"
  const [pathPart, queryPart] = hash.split("?");
  return {
    parts: pathPart.split("/").filter(Boolean),
    params: new URLSearchParams(queryPart || "")
  };
}

function route() {
  const { parts, params } = parseHash();
  const app = document.getElementById("app");

  destroyAudioPlayer(); // coupe toute lecture audio en cours avant de changer de page
  destroyVideoPlayer();

  currentFilter = params.get("cat") || "Tous";
  let html = "";
  if (parts.length === 0) {
    html = renderHome();
  } else if (parts[0] === "videos" && parts[1]) {
    html = renderVideoDetail(parts[1]);
  } else if (parts[0] === "videos") {
    html = renderVideosList();
  } else if (parts[0] === "audios" && parts[1]) {
    html = renderAudioDetail(parts[1]);
  } else if (parts[0] === "audios") {
    html = renderAudiosList();
  } else if (parts[0] === "articles" && parts[1]) {
    html = renderArticleDetail(parts[1]);
  } else if (parts[0] === "articles") {
    html = renderArticlesList();
  } else if (parts[0] === "abonnement") {
    html = renderSubscription();
  } else if (parts[0] === "compte") {
    html = renderAccount();
  } else if (parts[0] === "contact") {
    html = renderContact();
  } else {
    html = notFound();
  }

  app.innerHTML = html;
  document.getElementById("header-slot").innerHTML = renderHeader();
  document.getElementById("footer-slot").innerHTML = renderFooter();
  window.scrollTo(0, 0);

  if (params.get("session_id")) {
    handleStripeReturn(params.get("session_id"), location.hash.split("?")[0]);
  } else if (params.get("canceled")) {
    history.replaceState(null, "", location.hash.split("?")[0]);
    toast("Paiement annulé");
  }

  if (parts[0] === "audios" && parts[1]) {
    const a = AUDIOS.find(x => x.id === parts[1]);
    const media = AUDIO_MEDIA[parts[1]];
    if (a && media) {
      const hasFullAccess = Store.hasAccess(a.id, a.free);
      initAudioPlayer(media.youtubeId, `ytaudio-${a.id}`, hasFullAccess ? null : 30, a.previewStart);
    }
  }

  if (parts[0] === "videos" && parts[1]) {
    const v = VIDEOS.find(x => x.id === parts[1]);
    const media = VIDEO_MEDIA[parts[1]];
    if (v && media) {
      const hasFullAccess = Store.hasAccess(v.id, v.free);
      initVideoPlayer(media.youtubeId, `ytvideo-${v.id}`, hasFullAccess ? null : 30, v.startAt);
    }
  }

  if (parts[0] === "compte" && !Store.isLoggedIn) {
    initGoogleButton();
  }

  if ((parts[0] === "videos" || parts[0] === "audios" || parts[0] === "articles") && parts[1]) {
    const contentType = parts[0].slice(0, -1); // "videos" -> "video"
    loadComments(contentType, parts[1]);
  }
}

function rerenderBody() {
  route();
}

async function handleStripeReturn(sessionId, cleanPath) {
  toast("Vérification du paiement…");
  try {
    const res = await fetch(`/api/checkout-session/${sessionId}`);
    const data = await res.json();
    if (res.ok && data.kind === "session_purchase" && data.paymentStatus === "paid") {
      Store.unlockItem(data.contentId);
      toast("Paiement confirmé — séance débloquée 🎉");
    } else if (res.ok && (data.status === "active" || data.status === "trialing")) {
      Store.subscribeWithDetails({
        plan: data.plan,
        expiresAt: new Date(data.currentPeriodEnd * 1000).toISOString(),
        subscriptionId: data.subscriptionId,
        customerId: data.customerId,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd
      });
      toast("Paiement confirmé — abonnement activé 🎉");
    } else {
      toast("Paiement non confirmé pour le moment");
    }
  } catch (e) {
    toast("Impossible de vérifier le paiement auprès du serveur");
  }
  history.replaceState(null, "", cleanPath || "#/");
  rerenderBody();
}

document.addEventListener("click", async (e) => {
  const t = e.target.closest("[data-action]");
  if (!t) return;
  const action = t.dataset.action;

  if (action === "toggle-nav") {
    document.getElementById("nav-links").classList.toggle("open");
  }

  if (action === "toggle-theme") {
    applyTheme(getTheme() === "light" ? "dark" : "light");
    rerenderBody();
  }

  if (action === "close-seasonal-modal") {
    const overlay = t.closest(".modal-overlay") || document.querySelector(".modal-overlay");
    if (overlay) overlay.remove();
  }

  if (action === "close-quiz") {
    const overlay = t.closest(".modal-overlay");
    if (overlay) overlay.remove();
  }

  if (action === "quiz-answer") {
    const { q, v } = t.dataset;
    _quizAnswers[q] = v;
    t.parentElement.querySelectorAll(".quiz-opt").forEach(b => b.classList.remove("selected"));
    t.classList.add("selected");
  }

  if (action === "submit-quiz") {
    const overlay = t.closest(".modal-overlay");
    if (overlay) overlay.remove();
    toast("Merci pour ton retour ! 🙌");
  }

  if (action === "toggle-fav") {
    e.preventDefault();
    Store.toggleFavorite(t.dataset.id);
    rerenderBody();
  }

  if (action === "filter") {
    currentFilter = t.dataset.cat;
    const hash = location.hash;
    const app = document.getElementById("app");
    if (hash.startsWith("#/videos")) app.innerHTML = renderVideosList();
    else if (hash.startsWith("#/audios")) app.innerHTML = renderAudiosList();
    else if (hash.startsWith("#/articles")) app.innerHTML = renderArticlesList();
  }

  if (action === "select-plan") {
    selectedPlan = t.dataset.plan;
    document.getElementById("app").innerHTML = renderSubscription();
  }

  if (action === "subscribe") {
    const plan = t.dataset.plan;
    if (!Store.isLoggedIn) {
      toast("Crée d'abord un profil dans Mon compte 👤");
      location.hash = "#/compte";
      return;
    }

    if (APP_CONFIG.stripeConfigured) {
      const originalLabel = t.textContent;
      t.disabled = true;
      t.textContent = "Redirection vers Stripe…";
      try {
        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, email: Store.state.user.email, name: Store.state.user.name })
        });
        const data = await res.json();
        if (res.ok && data.url) {
          window.location.href = data.url; // vraie page de paiement hébergée par Stripe
          return;
        }
        toast(data.message || "Erreur lors de la création du paiement");
      } catch (err) {
        toast("Impossible de contacter le serveur de paiement");
      }
      t.disabled = false;
      t.textContent = originalLabel;
    } else {
      Store.subscribeDemo(plan);
      toast("Abonnement activé 🎉 (mode démo — Stripe non configuré)");
      rerenderBody();
    }
  }

  if (action === "buy-session") {
    const { type: contentType, id: contentId, title: contentTitle } = t.dataset;
    if (!Store.isLoggedIn) {
      toast("Crée d'abord un profil dans Mon compte 👤");
      location.hash = "#/compte";
      return;
    }

    if (APP_CONFIG.stripeConfigured) {
      const originalLabel = t.textContent;
      t.disabled = true;
      t.textContent = "Redirection vers Stripe…";
      try {
        const res = await fetch("/api/create-session-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType, contentId, contentTitle, email: Store.state.user.email })
        });
        const data = await res.json();
        if (res.ok && data.url) {
          window.location.href = data.url;
          return;
        }
        toast(data.message || "Erreur lors de la création du paiement");
      } catch (err) {
        toast("Impossible de contacter le serveur de paiement");
      }
      t.disabled = false;
      t.textContent = originalLabel;
    } else {
      Store.unlockItem(contentId);
      toast("Séance débloquée 🎉 (mode démo — Stripe non configuré)");
      rerenderBody();
    }
  }

  if (action === "cancel-sub") {
    const sub = Store.state.subscription;
    if (sub && sub.live && sub.subscriptionId && APP_CONFIG.stripeConfigured) {
      t.disabled = true;
      try {
        const res = await fetch("/api/cancel-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionId: sub.subscriptionId })
        });
        const data = await res.json();
        if (res.ok) {
          Store.markCancelAtPeriodEnd();
          toast("Abonnement annulé — accès actif jusqu'à la fin de la période payée");
        } else {
          toast(data.message || "Erreur lors de l'annulation");
        }
      } catch (err) {
        toast("Impossible de contacter le serveur");
      }
    } else {
      Store.cancelSubscription();
      toast("Abonnement annulé");
    }
    rerenderBody();
  }

  if (action === "auth-mode") {
    authMode = t.dataset.mode;
    rerenderBody();
  }

  if (action === "register" || action === "login-password") {
    const isRegister = action === "register";
    const name = isRegister ? document.getElementById("acc-name").value.trim() : "";
    const email = document.getElementById("acc-email").value.trim();
    const password = document.getElementById("acc-password").value;
    const emailErrorEl = document.getElementById("acc-email-error");
    const emailInput = document.getElementById("acc-email");
    const passwordErrorEl = document.getElementById("acc-password-error");
    const passwordInput = document.getElementById("acc-password");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    [emailErrorEl, passwordErrorEl].forEach(el => { if (el) el.style.display = "none"; });
    [emailInput, passwordInput].forEach(el => { if (el) el.classList.remove("invalid"); });

    if ((isRegister && !name) || !email || !password) {
      toast("Merci de remplir tous les champs");
      return;
    }
    if (!emailRegex.test(email)) {
      if (emailErrorEl) { emailErrorEl.textContent = "⚠️ Cette adresse email n'est pas valide."; emailErrorEl.style.display = "block"; }
      if (emailInput) emailInput.classList.add("invalid");
      return;
    }
    if (isRegister && password.length < 8) {
      if (passwordErrorEl) { passwordErrorEl.textContent = "⚠️ 8 caractères minimum."; passwordErrorEl.style.display = "block"; }
      if (passwordInput) passwordInput.classList.add("invalid");
      return;
    }

    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRegister ? { name, email, password } : { email, password })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        Store.setUser(data.user);
        toast(`Bienvenue ${data.user.name} 👋`);
        playWelcomeChime(data.user.name);
        rerenderBody();
      } else if (res.status === 401) {
        if (passwordErrorEl) { passwordErrorEl.textContent = "⚠️ " + (data.message || "Email ou mot de passe incorrect."); passwordErrorEl.style.display = "block"; }
        if (passwordInput) passwordInput.classList.add("invalid");
      } else if (res.status === 409) {
        if (emailErrorEl) { emailErrorEl.textContent = "⚠️ " + data.message; emailErrorEl.style.display = "block"; }
        if (emailInput) emailInput.classList.add("invalid");
      } else {
        toast(data.message || "Une erreur est survenue");
      }
    } catch (err) {
      toast("Impossible de contacter le serveur");
    }
  }

  if (action === "logout") {
    Store.clearUser();
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    rerenderBody();
  }

  if (action === "audio-toggle") {
    toggleAudioPlay();
  }

  if (action === "video-toggle") {
    toggleVideoPlay();
  }

  if (action === "submit-comment") {
    const { contentType, contentId } = t.dataset;
    const input = document.getElementById("comment-input");
    const text = input ? input.value.trim() : "";
    if (!text) return;
    t.disabled = true;
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, contentId, text })
      });
      const data = await res.json();
      if (res.ok) {
        if (input) input.value = "";
        loadComments(contentType, contentId);
      } else {
        toast(data.message || "Impossible de publier le commentaire");
      }
    } catch (err) {
      toast("Impossible de contacter le serveur");
    }
    t.disabled = false;
  }

  if (action === "send-contact") {
    const name = document.getElementById("contact-name").value.trim();
    const email = document.getElementById("contact-email").value.trim();
    const message = document.getElementById("contact-message").value.trim();
    const errorEl = document.getElementById("contact-error");
    errorEl.style.display = "none";

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message) {
      errorEl.textContent = "Merci de remplir ton nom, un email valide et un message.";
      errorEl.style.display = "block";
      return;
    }

    const originalLabel = t.textContent;
    t.disabled = true;
    t.textContent = "Envoi…";
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message })
      });
      const data = await res.json();
      if (res.ok) {
        toast("Message envoyé — on te répond bientôt 📬");
        document.getElementById("contact-message").value = "";
      } else {
        errorEl.textContent = data.message || "L'envoi a échoué, réessaie.";
        errorEl.style.display = "block";
      }
    } catch (err) {
      errorEl.textContent = "Impossible de contacter le serveur.";
      errorEl.style.display = "block";
    }
    t.disabled = false;
    t.textContent = originalLabel;
  }

  if (action === "delete-comment") {
    const commentId = t.dataset.commentId;
    const section = t.closest("[data-comments-for]");
    const [contentType, contentId] = section ? section.dataset.commentsFor.split(":") : [null, null];
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      if (res.ok && contentType) loadComments(contentType, contentId);
    } catch (err) {
      toast("Impossible de contacter le serveur");
    }
  }
});

async function loadComments(contentType, contentId) {
  const section = document.querySelector(`[data-comments-for="${contentType}:${contentId}"]`);
  if (!section) return;
  const list = section.querySelector("[data-comments-list]");
  try {
    const res = await fetch(`/api/comments/${contentType}/${contentId}`);
    const data = await res.json();
    const comments = data.comments || [];
    list.innerHTML = comments.length
      ? comments.map(commentItem).join("")
      : `<p class="comments-empty">Aucun commentaire pour l'instant — sois le premier à en laisser un !</p>`;
  } catch (err) {
    list.innerHTML = `<p class="comments-empty">Impossible de charger les commentaires.</p>`;
  }
}

document.addEventListener("input", (e) => {
  const audioSeek = e.target.closest("[data-action='audio-seek']");
  if (audioSeek) seekAudio(Number(audioSeek.value));

  const videoSeek = e.target.closest("[data-action='video-seek']");
  if (videoSeek) seekVideo(Number(videoSeek.value));
});

window.addEventListener("hashchange", route);

window.addEventListener("DOMContentLoaded", async () => {
  await loadAppConfig();
  route();
  syncSessionFromServer();
  handleSeasonalMessages();
});

// ---------- Messages saisonniers (fêtes de fin d'année) ----------

function handleSeasonalMessages() {
  const forcePreview = new URLSearchParams(location.hash.split("?")[1] || "").get("preview");
  if (forcePreview === "postholiday") { showPostHolidayModal(); return; }
  if (forcePreview === "holiday") {
    // Les navigateurs bloquent le son tant qu'il n'y a pas eu de clic sur la page :
    // on attend le premier clic avant de jouer le jingle en mode aperçu.
    toast("Clique n'importe où pour entendre le son 🔊");
    document.addEventListener("click", () => playHolidayChime(), { once: true });
    return;
  }

  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();
  const isHolidayPeriod = (month === 12 && day >= 20) || (month === 1 && day <= 2);
  const isPostHolidayPeriod = month === 1 && day >= 3 && day <= 31;

  if (isHolidayPeriod && !sessionStorage.getItem("fitzen_holiday_chime")) {
    sessionStorage.setItem("fitzen_holiday_chime", "1");
    setTimeout(() => playHolidayChime(), 600);
  }

  if (isPostHolidayPeriod && !sessionStorage.getItem("fitzen_postholiday_modal")) {
    sessionStorage.setItem("fitzen_postholiday_modal", "1");
    setTimeout(() => showPostHolidayModal(), 800);
  }
}

function playHolidayChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    // Petit motif festif (plus long que le jingle de bienvenue).
    const notes = [523.25, 523.25, 587.33, 523.25, 698.46, 659.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    });
    if (window.speechSynthesis) {
      setTimeout(() => {
        const utter = new SpeechSynthesisUtterance("Joyeuses fêtes !");
        utter.lang = "fr-FR";
        utter.pitch = 1.2;
        window.speechSynthesis.speak(utter);
      }, notes.length * 220 + 200);
    }
  } catch (e) {
    // Audio indisponible : on ignore.
  }
}

// ---------- Petit questionnaire de fin de séance ----------

let _quizAnswers = { finished: null, feeling: null, again: null };

function showEndOfSessionQuiz() {
  if (document.querySelector(".modal-box[data-quiz]")) return; // déjà affiché
  _quizAnswers = { finished: null, feeling: null, again: null };
  const title = document.querySelector(".detail-title")?.textContent || "cette séance";
  const node = el(`
    <div class="modal-overlay">
      <div class="modal-box" data-quiz>
        <button class="modal-close" data-action="close-quiz">✕</button>
        <div style="font-size:2rem; margin-bottom:8px;">🏁</div>
        <h2 style="margin:0 0 6px;">Séance terminée !</h2>
        <p class="detail-desc" style="margin-bottom:20px;">Quelques secondes pour nous dire comment ça s'est passé sur « ${escapeHtml(title)} ».</p>

        <div class="quiz-question">
          <p class="quiz-label">As-tu suivi la séance en entier ?</p>
          <div class="quiz-options">
            <button class="quiz-opt" data-action="quiz-answer" data-q="finished" data-v="oui">Oui</button>
            <button class="quiz-opt" data-action="quiz-answer" data-q="finished" data-v="partiel">En partie</button>
            <button class="quiz-opt" data-action="quiz-answer" data-q="finished" data-v="non">Non</button>
          </div>
        </div>

        <div class="quiz-question">
          <p class="quiz-label">Comment tu te sens ?</p>
          <div class="quiz-options">
            <button class="quiz-opt" data-action="quiz-answer" data-q="feeling" data-v="fatigue">😴 Fatigué·e</button>
            <button class="quiz-opt" data-action="quiz-answer" data-q="feeling" data-v="neutre">😐 Neutre</button>
            <button class="quiz-opt" data-action="quiz-answer" data-q="feeling" data-v="forme">💪 En forme</button>
          </div>
        </div>

        <div class="quiz-question">
          <p class="quiz-label">Referais-tu cette séance ?</p>
          <div class="quiz-options">
            <button class="quiz-opt" data-action="quiz-answer" data-q="again" data-v="oui">Oui</button>
            <button class="quiz-opt" data-action="quiz-answer" data-q="again" data-v="peut-etre">Peut-être</button>
            <button class="quiz-opt" data-action="quiz-answer" data-q="again" data-v="non">Non</button>
          </div>
        </div>

        <button class="btn btn-primary" data-action="submit-quiz" style="margin-top:8px;">Envoyer mon retour</button>
      </div>
    </div>
  `);
  document.body.appendChild(node);
}

function showPostHolidayModal() {
  const node = el(`
    <div class="modal-overlay">
      <div class="modal-box">
        <button class="modal-close" data-action="close-seasonal-modal">✕</button>
        <div style="font-size:2.2rem; margin-bottom:8px;">🎄🍽️</div>
        <h2 style="margin:0 0 12px;">Un peu trop mangé pendant les fêtes ?</h2>
        <p class="detail-desc" style="margin-bottom:20px;">Pas de panique, on reprend en douceur — direction les séances spécial minceur pour repartir du bon pied.</p>
        <a href="#/videos?cat=Minceur" class="btn btn-primary" data-action="close-seasonal-modal">Aller voir les cours pour mincir</a>
      </div>
    </div>
  `);
  document.body.appendChild(node);
}

// ---------- Connexion Google (Google Identity Services) ----------

let _googleButtonAttempts = 0;

function initGoogleButton() {
  if (!APP_CONFIG.googleClientId) return;
  const container = document.getElementById("google-signin-btn");
  if (!container) return;

  if (!window.google || !google.accounts || !google.accounts.id) {
    // Le script Google se charge de façon asynchrone : on réessaie brièvement.
    if (_googleButtonAttempts < 15) {
      _googleButtonAttempts++;
      setTimeout(initGoogleButton, 200);
    }
    return;
  }
  _googleButtonAttempts = 0;

  google.accounts.id.initialize({
    client_id: APP_CONFIG.googleClientId,
    callback: handleGoogleCredential
  });
  google.accounts.id.renderButton(container, { theme: "filled_black", size: "large", shape: "pill", width: 280 });
}

async function handleGoogleCredential(response) {
  try {
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential })
    });
    const data = await res.json();
    if (res.ok && data.user) {
      Store.setUser(data.user);
      toast(`Bienvenue ${data.user.name} 👋`);
      playWelcomeChime(data.user.name);
      rerenderBody();
    } else {
      toast(data.message || "Connexion Google impossible");
    }
  } catch (e) {
    toast("Impossible de contacter le serveur");
  }
}

async function syncSessionFromServer() {
  try {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    if (data.user) {
      Store.setUser(data.user);
      if (location.hash.startsWith("#/compte")) rerenderBody();
    }
  } catch (e) {
    // Pas de session serveur disponible : on reste sur l'état local existant.
  }
}
