// Configuration serveur (clé publique Stripe, disponibilité Stripe/Pexels).

let APP_CONFIG = { publishableKey: "", stripeConfigured: false, prices: null };

async function loadAppConfig() {
  try {
    const res = await fetch("/api/config");
    if (res.ok) APP_CONFIG = await res.json();
  } catch (e) {
    // Backend indisponible : l'app reste utilisable en mode démo local.
  }
}
