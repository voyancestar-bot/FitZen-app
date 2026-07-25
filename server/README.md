# Activer le paiement réel (Stripe)

L'app fonctionne déjà sans rien configurer (mode démo : abonnement local factice,
vignettes en dégradé). Pour activer les vraies fonctionnalités, suis ces étapes.

## 1. Stripe (paiement réel)

1. Crée un compte gratuit sur https://dashboard.stripe.com/register
2. Reste en **mode Test** pour commencer (cartes de test, aucun vrai débit).
   Bascule en mode Live seulement quand tu es prêt à encaisser réellement.
3. Récupère tes clés API : https://dashboard.stripe.com/test/apikeys
   - `Clé publiable` → `STRIPE_PUBLISHABLE_KEY`
   - `Clé secrète` → `STRIPE_SECRET_KEY`
4. Crée deux produits récurrents dans https://dashboard.stripe.com/test/products :
   - "FitZen Mensuel" — 9,99 € / mois
   - "FitZen Annuel" — 79,99 € / an
   Copie l'ID de prix de chacun (commence par `price_...`) dans
   `STRIPE_PRICE_MONTHLY` et `STRIPE_PRICE_ANNUAL`.
5. (Optionnel mais recommandé en production) crée un webhook pointant vers
   `https://ton-domaine.com/api/stripe-webhook` pour les évènements
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, et colle le secret de signature dans
   `STRIPE_WEBHOOK_SECRET`.

Pour tester un paiement réel (en mode Test), utilise la carte de test Stripe
`4242 4242 4242 4242`, une date future, un CVC quelconque.

En plus de l'abonnement mensuel/annuel, chaque contenu premium propose aussi
un paiement à la séance (3,00 €, montant fixé côté serveur dans `server.py`
via `SESSION_PRICE_CENTS` — aucun produit Stripe à créer pour ça, le prix est
généré à la volée). Le bouton "Payer 3€ cette séance" apparaît automatiquement
sur toute vidéo/audio/article verrouillé.

## 2. Emails de confirmation d'abonnement

Deux emails distincts peuvent partir quand quelqu'un s'abonne :

**Reçu de paiement Stripe** (aucune clé requise) : active
"Paiements réussis" sur https://dashboard.stripe.com/settings/emails —
Stripe envoie alors automatiquement un reçu officiel à chaque prélèvement.

**Email de bienvenue FitZen personnalisé** (via Resend, gratuit) :
1. Crée un compte sur https://resend.com/signup
2. Récupère une clé API sur https://resend.com/api-keys → `RESEND_API_KEY`
3. Sans domaine vérifié, Resend limite l'envoi à l'adresse email de ton
   propre compte (mode bac à sable) — suffisant pour tester. Pour envoyer à
   n'importe quel client, vérifie un domaine dans Resend puis mets à jour
   `RESEND_FROM_EMAIL` avec une adresse de ce domaine.

L'email est envoyé automatiquement dès qu'un paiement d'abonnement est
confirmé (dans `/api/checkout-session/<id>`, voir `maybe_send_welcome_email`
dans `server.py`). Sans `RESEND_API_KEY`, cette étape est simplement ignorée
(aucune erreur).

### Emails de rappel ("tu nous manques")

Chaque profil créé dans **Mon compte** est enregistré côté serveur
(`server/subscribers.json`, exclu de git). Le script `server/send_reminders.py`
envoie un email de rappel à tous ces profils :

```bash
source venv/bin/activate
python3 server/send_reminders.py
```

⚠️ Ce n'est **pas automatique** : ce script doit être relancé manuellement, ou
planifié toi-même (cron sur Mac/Linux, Planificateur de tâches sur Windows) sur
une machine allumée en permanence — le serveur de démo sur ton ordinateur ne
tourne que pendant que tu le lances, il ne peut pas envoyer d'emails "tout
seul" quand ton Mac est éteint. Pour un vrai envoi automatique et récurrent en
production, il faudrait héberger l'app sur un serveur permanent avec une
tâche planifiée (ex. cron job côté hébergeur).

## 3. Comptes utilisateurs (mot de passe + Google)

Les comptes sont stockés dans une vraie base SQLite locale
(`server/app.db`, exclue de git, créée automatiquement au premier lancement),
mots de passe hashés (jamais stockés en clair).

**Connexion par mot de passe** : fonctionne dès le lancement, sans clé
supplémentaire. Un email de bienvenue part automatiquement à l'inscription
(voir section 2, nécessite `RESEND_API_KEY`).

**Connexion Google** :
1. Va sur https://console.cloud.google.com/ et crée un projet (gratuit)
2. Menu "APIs et services" → "Écran de consentement OAuth" → type **Externe**
   → remplis le minimum (nom de l'app, email) → enregistre (le mode "Test"
   suffit, pas besoin de validation Google pour développer)
3. "APIs et services" → "Identifiants" → "Créer des identifiants" →
   "ID client OAuth" → type **Application Web**
4. Dans "Origines JavaScript autorisées", ajoute `http://localhost:8420`
   (et l'URL de ton domaine si tu déploies ailleurs)
5. Copie le **Client ID** généré (se termine par `.apps.googleusercontent.com`)
   dans `GOOGLE_CLIENT_ID` — **pas besoin du "Client Secret"**, cette méthode
   de connexion (Google Identity Services) n'en a pas besoin.

Sans `GOOGLE_CLIENT_ID`, le bouton "Se connecter avec Google" n'apparaît
simplement pas — le reste de l'app fonctionne normalement.

## 4. Vidéos réelles

Chaque vidéo est un vrai cours complet (20 à 35 min) intégré via un embed
YouTube officiel (`youtubeId` dans `js/data.js`) — **aucune clé n'est
nécessaire**, ça fonctionne dès le premier lancement, sans extrait ni boucle.

Pour changer une vidéo : remplace le champ `youtubeId` de l'entrée
correspondante dans `js/data.js` par l'ID d'une autre vidéo YouTube publique
(la partie après `v=` dans son URL). Pour héberger tes propres cours filmés
au lieu de dépendre de YouTube, remplace le rendu `<iframe>` dans
`renderVideoDetail` (`js/views.js`) par une balise `<video>` pointant vers
tes fichiers.

## 5. Configuration

```bash
cd fitness-app
cp .env.example .env
# édite .env avec tes vraies clés
```

## 6. Lancer le serveur

```bash
cd fitness-app
source venv/bin/activate   # ou: python3 -m venv venv && source venv/bin/activate && pip install -r server/requirements.txt
python3 server/server.py
```

L'app tourne sur http://localhost:8420 (frontend + API sur le même serveur).

Sans `.env` rempli, l'app continue de fonctionner en mode démo (aucune erreur
bloquante) : les boutons "S'abonner" activent un abonnement local factice, et
les vignettes vidéo restent en dégradé de couleur.

## 7. Mettre l'app en ligne gratuitement (Render.com)

Pour que d'autres personnes que toi puissent y accéder (pas juste `localhost`),
il faut héberger le code sur un serveur accessible sur internet. Render.com
propose une offre gratuite adaptée à ce projet (Flask + fichiers statiques).

1. Crée un compte gratuit sur https://github.com (si tu n'en as pas déjà un),
   crée un nouveau dépôt (repository) vide, puis pousse ce code dedans :
   ```bash
   cd fitness-app
   git add -A
   git commit -m "Première mise en ligne"
   git remote add origin https://github.com/TON-PSEUDO/TON-DEPOT.git
   git push -u origin main
   ```
2. Crée un compte gratuit sur https://render.com (tu peux te connecter avec ton
   compte GitHub directement).
3. Clique sur **"New +"** → **"Web Service"**, choisis le dépôt GitHub que tu
   viens de créer.
4. Renseigne :
   - **Build Command** : `pip install -r server/requirements.txt`
   - **Start Command** : `gunicorn --chdir server server:app`
   - **Instance Type** : Free
5. Dans l'onglet **"Environment"**, ajoute toutes les variables de ton fichier
   `.env` local (une par une : `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`,
   `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, `RESEND_API_KEY`,
   `RESEND_FROM_EMAIL`, `FLASK_SECRET_KEY`, `GOOGLE_CLIENT_ID`), plus
   `APP_BASE_URL` avec l'adresse que Render va te donner (visible après le
   premier déploiement, du type `https://ton-app.onrender.com`).
6. Une fois déployé, retourne dans Google Cloud Console (voir section 3) et
   ajoute cette même adresse dans "Origines JavaScript autorisées" pour que
   "Se connecter avec Google" fonctionne aussi en ligne.

⚠️ Sur l'offre gratuite de Render : le serveur "s'endort" après 15 minutes
sans visite (le premier chargement après une pause peut prendre ~30 secondes),
et le fichier `server/app.db` (comptes utilisateurs) peut être réinitialisé à
chaque redéploiement car le disque n'est pas persistant sur ce plan gratuit.
Pour un site avec de vrais utilisateurs sur la durée, il faudra passer sur une
offre payante avec disque persistant (quelques dollars/mois).
