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

function formatPrice(n) {
  return n.toFixed(2).replace(".", ",") + " €";
}

function findContent(id) {
  return VIDEOS.find(v => v.id === id) || AUDIOS.find(a => a.id === id) || ARTICLES.find(r => r.id === id) || null;
}
