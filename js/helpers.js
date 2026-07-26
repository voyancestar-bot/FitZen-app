function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function badge(free) {
  return free
    ? `<span class="badge badge-free">Gratuit</span>`
    : `<span class="badge badge-premium">★ Premium</span>`;
}

function favBtn(id) {
  const active = Store.isFavorite(id);
  return `<button class="fav-btn ${active ? "active" : ""}" data-action="toggle-fav" data-id="${id}" title="Favori">${active ? "♥" : "♡"}</button>`;
}

function toast(msg) {
  let node = document.getElementById("toast");
  if (!node) {
    node = el(`<div id="toast" class="toast"></div>`);
    document.body.appendChild(node);
  }
  node.textContent = msg;
  node.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => node.classList.remove("show"), 2200);
}

// Petit jingle de bienvenue (généré, pas de fichier audio) + le prénom dit à voix haute.
function playWelcomeChime(name) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // Do-Mi-Sol-Do : petit arpège festif
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.13;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.35);
    });

    if (window.speechSynthesis && name) {
      setTimeout(() => {
        const utter = new SpeechSynthesisUtterance(`Bienvenue ${name} !`);
        utter.lang = "fr-FR";
        utter.pitch = 1.15;
        utter.rate = 1.0;
        window.speechSynthesis.speak(utter);
      }, notes.length * 130 + 150);
    }
  } catch (e) {
    // Audio non disponible (autoplay bloqué, navigateur non compatible...) : on ignore silencieusement.
  }
}

function formatPrice(n) {
  return n.toFixed(2).replace(".", ",") + " €";
}

function findContent(id) {
  return VIDEOS.find(v => v.id === id) || AUDIOS.find(a => a.id === id) || ARTICLES.find(r => r.id === id) || null;
}
