// Gestion de l'état utilisateur / abonnement, persistée en localStorage (démo côté client uniquement).

const STORAGE_KEY = "fitzen_state_v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.purchasedItems) parsed.purchasedItems = [];
      return parsed;
    }
  } catch (e) {}
  return { user: null, subscription: null, favorites: [], purchasedItems: [] };
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const Store = {
  state: loadState(),

  get isLoggedIn() {
    return !!this.state.user;
  },

  get isSubscribed() {
    if (!this.state.subscription) return false;
    return new Date(this.state.subscription.expiresAt) > new Date();
  },

  setUser(user) {
    this.state.user = user;
    saveState(this.state);
  },

  clearUser() {
    this.state.user = null;
    saveState(this.state);
  },

  // Abonnement démo (pas de Stripe configuré côté serveur) : activation locale immédiate.
  subscribeDemo(planId) {
    const now = new Date();
    const expires = new Date(now);
    if (planId === "annual") expires.setFullYear(expires.getFullYear() + 1);
    else expires.setMonth(expires.getMonth() + 1);
    this.state.subscription = {
      plan: planId,
      startedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      live: false
    };
    saveState(this.state);
  },

  // Abonnement réel confirmé par Stripe après un paiement Checkout.
  subscribeWithDetails(details) {
    this.state.subscription = {
      plan: details.plan,
      startedAt: new Date().toISOString(),
      expiresAt: details.expiresAt,
      subscriptionId: details.subscriptionId || null,
      customerId: details.customerId || null,
      cancelAtPeriodEnd: !!details.cancelAtPeriodEnd,
      live: true
    };
    saveState(this.state);
  },

  markCancelAtPeriodEnd() {
    if (this.state.subscription) {
      this.state.subscription.cancelAtPeriodEnd = true;
      saveState(this.state);
    }
  },

  cancelSubscription() {
    this.state.subscription = null;
    saveState(this.state);
  },

  // Achat à la séance (paiement unique Stripe de 3€, ou déblocage démo si Stripe non configuré).
  unlockItem(contentId) {
    if (!this.state.purchasedItems.includes(contentId)) {
      this.state.purchasedItems.push(contentId);
      saveState(this.state);
    }
  },

  hasPurchased(contentId) {
    return this.state.purchasedItems.includes(contentId);
  },

  // Vrai contrôle d'accès à utiliser partout : gratuit, abonné, ou acheté à la séance.
  hasAccess(contentId, isFree) {
    return !!isFree || this.isSubscribed || this.hasPurchased(contentId);
  },

  toggleFavorite(id) {
    const idx = this.state.favorites.indexOf(id);
    if (idx >= 0) this.state.favorites.splice(idx, 1);
    else this.state.favorites.push(id);
    saveState(this.state);
  },

  isFavorite(id) {
    return this.state.favorites.includes(id);
  }
};
