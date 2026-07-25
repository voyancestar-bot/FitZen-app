import os
import time
import json
import sqlite3
import secrets
import logging
from pathlib import Path

import requests
import stripe
from flask import Flask, jsonify, request, send_from_directory, abort, session
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("fitzen")

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_PRICE_MONTHLY = os.environ.get("STRIPE_PRICE_MONTHLY", "")
STRIPE_PRICE_ANNUAL = os.environ.get("STRIPE_PRICE_ANNUAL", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
PEXELS_API_KEY = os.environ.get("PEXELS_API_KEY", "")
APP_BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:8420")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "FitZen <onboarding@resend.dev>")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
FLASK_SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "")

for _env_name in ("STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "APP_BASE_URL"):
    _val = os.environ.get(_env_name, "")
    _bad = [i for i, ch in enumerate(_val) if ord(ch) > 255]
    log.info("ENV CHECK %s: len=%d ascii_ok=%s bad_positions=%s", _env_name, len(_val), not _bad, _bad[:10])

stripe.api_key = STRIPE_SECRET_KEY
# Désactive la télémétrie : sur certains hébergeurs (ex. Render), platform.platform()
# retourne une chaîne mal encodée et fait planter les appels Stripe avec une
# UnicodeEncodeError ("latin-1 codec can't encode..."). Ce réglage évite cet appel.
stripe.enable_telemetry = False

app = Flask(__name__, static_folder=None)
# Sans FLASK_SECRET_KEY définie, on en génère une aléatoire au démarrage : les sessions
# restent valides tant que le serveur tourne, mais sont invalidées à chaque redémarrage.
app.secret_key = FLASK_SECRET_KEY or secrets.token_hex(32)

PLAN_PRICE_IDS = {
    "monthly": STRIPE_PRICE_MONTHLY,
    "annual": STRIPE_PRICE_ANNUAL,
}


def stripe_configured():
    return bool(STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY and STRIPE_PRICE_MONTHLY and STRIPE_PRICE_ANNUAL)


# ---------- Comptes utilisateurs (mot de passe + Google) ----------

DB_PATH = ROOT_DIR / "server" / "app.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT,
            google_id TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content_type TEXT NOT NULL,
            content_id TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            user_name TEXT NOT NULL,
            text TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def user_to_dict(row):
    return {"id": row["id"], "name": row["name"], "email": row["email"]}


def find_user_by_email(email):
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower(),)).fetchone()
    conn.close()
    return row


def create_user(name, email, password=None, google_id=None):
    conn = get_db()
    # method="pbkdf2:sha256" explicite : le défaut "scrypt" de Werkzeug plante sur les
    # environnements Python liés à LibreSSL (pas de hashlib.scrypt), contrairement à PBKDF2.
    password_hash = generate_password_hash(password, method="pbkdf2:sha256") if password else None
    cur = conn.execute(
        "INSERT INTO users (name, email, password_hash, google_id) VALUES (?, ?, ?, ?)",
        (name, email.lower(), password_hash, google_id),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return row


# ---------- Emails (Resend) ----------

PLAN_LABELS = {"monthly": "Mensuel", "annual": "Annuel"}
_welcomed_sessions = set()  # évite de renvoyer l'email si la page est rafraîchie

# Photo de sport réelle (chargement vérifié) utilisée en en-tête des emails.
EMAIL_HERO_IMAGE = "https://img.youtube.com/vi/umyBetUQnkU/maxresdefault.jpg"

SUBSCRIBERS_FILE = ROOT_DIR / "server" / "subscribers.json"


def send_email(to_email, subject, html):
    if not RESEND_API_KEY:
        log.info("RESEND_API_KEY manquante : email '%s' non envoyé à %s", subject, to_email)
        return False
    try:
        res = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={"from": RESEND_FROM_EMAIL, "to": [to_email], "subject": subject, "html": html},
            timeout=10,
        )
        if res.ok:
            log.info("Email '%s' envoyé à %s", subject, to_email)
            return True
        log.warning("Échec envoi email Resend (%s): %s", res.status_code, res.text)
        return False
    except requests.RequestException:
        log.exception("Erreur réseau lors de l'envoi de l'email")
        return False


def render_email_shell(title, body_html, cta_label="Ouvrir FitZen", cta_href=None):
    return f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background:#0f1115; border-radius:16px; overflow:hidden;">
      <img src="{EMAIL_HERO_IMAGE}" alt="" style="width:100%; height:200px; object-fit:cover; display:block;" />
      <div style="padding: 28px 28px 32px;">
        <div style="color:#b6ff3c; font-weight:800; letter-spacing:0.05em; font-size:0.75rem; text-transform:uppercase; margin-bottom:10px;">FitZen</div>
        <h1 style="color:#ffffff; font-size:1.4rem; margin:0 0 16px; line-height:1.3;">{title}</h1>
        <div style="color:#c7c9d1; font-size:0.95rem; line-height:1.7;">
          {body_html}
        </div>
        <p style="margin-top:28px;">
          <a href="{cta_href or APP_BASE_URL}" style="background:#b6ff3c;color:#0b0d10;padding:13px 22px;border-radius:999px;text-decoration:none;font-weight:700;font-size:0.9rem;">{cta_label}</a>
        </p>
        <p style="margin-top:32px; font-size:0.78rem; color:#5b6070;">FitZen — Bouge, respire, progresse.</p>
      </div>
    </div>
    """


def maybe_send_welcome_email(session_id, to_email, name, plan, current_period_end):
    if session_id in _welcomed_sessions:
        return
    _welcomed_sessions.add(session_id)

    plan_label = PLAN_LABELS.get(plan, plan or "")
    expires_txt = ""
    if current_period_end:
        from datetime import datetime, timezone
        expires_txt = datetime.fromtimestamp(current_period_end, tz=timezone.utc).strftime("%d/%m/%Y")

    greeting = f"Salut {name} 👋" if name else "Salut 👋"
    expires_line = f" Ton abonnement se renouvelle automatiquement le <strong>{expires_txt}</strong>." if expires_txt else ""

    body = f"""
      <p>{greeting}</p>
      <p>C'est officiel : ton abonnement <strong>{plan_label}</strong> est actif. Bienvenue dans la
      communauté FitZen — à partir de maintenant, plus aucune excuse pour sauter une séance 💪</p>
      <p>Voici ce qui t'attend :</p>
      <ul style="padding-left:20px; margin:12px 0;">
        <li>🎬 Des cours complets et réels (yoga, HIIT, pilates, boxe...), du débutant au confirmé</li>
        <li>🎧 Des audios de relaxation et méditations guidées pour décompresser</li>
        <li>📖 Des articles pour progresser intelligemment (nutrition, récupération, motivation)</li>
      </ul>
      <p>Le plus dur est fait : tu t'es inscrit·e. La suite, c'est juste un pas à la fois.{expires_line}</p>
    """
    html = render_email_shell(
        "Bienvenue chez FitZen Premium 🎉",
        body,
        cta_label="Découvrir le catalogue",
        cta_href=f"{APP_BASE_URL}/#/videos",
    )
    send_email(to_email, "Bienvenue chez FitZen Premium 🎉", html)


# ---------- Emails de rappel ("reviens sur l'app") ----------

def load_subscribers():
    if not SUBSCRIBERS_FILE.exists():
        return []
    try:
        return json.loads(SUBSCRIBERS_FILE.read_text())
    except (json.JSONDecodeError, OSError):
        return []


def save_subscriber(email, name):
    subs = load_subscribers()
    if not any(s["email"].lower() == email.lower() for s in subs):
        subs.append({"email": email, "name": name})
        SUBSCRIBERS_FILE.write_text(json.dumps(subs, indent=2, ensure_ascii=False))


# ---------- Static frontend ----------

@app.route("/")
def index():
    resp = send_from_directory(ROOT_DIR, "index.html")
    resp.headers["Cache-Control"] = "no-store"
    return resp


@app.route("/<path:path>")
def static_files(path):
    full = ROOT_DIR / path
    if full.is_file():
        resp = send_from_directory(ROOT_DIR, path)
        resp.headers["Cache-Control"] = "no-store"
        return resp
    abort(404)


# ---------- Stripe ----------

@app.route("/api/config")
def config():
    return jsonify({
        "publishableKey": STRIPE_PUBLISHABLE_KEY,
        "stripeConfigured": stripe_configured(),
        "googleClientId": GOOGLE_CLIENT_ID,
        "prices": {
            "monthly": {"amount": 9.99, "currency": "eur"},
            "annual": {"amount": 79.99, "currency": "eur"},
        },
    })


# ---------- Authentification ----------

@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or "@" not in email:
        return jsonify({"error": "invalid_input", "message": "Nom ou email invalide."}), 400
    if len(password) < 8:
        return jsonify({"error": "weak_password", "message": "Le mot de passe doit contenir au moins 8 caractères."}), 400
    if find_user_by_email(email):
        return jsonify({"error": "email_taken", "message": "Un compte existe déjà avec cet email."}), 409

    row = create_user(name, email, password=password)
    session["user_id"] = row["id"]

    save_subscriber(email, name)
    body = f"""
      <p>Salut {name} 👋</p>
      <p>Ton compte FitZen vient d'être créé avec succès. Tu peux dès maintenant explorer
      les vidéos gratuites, les audios de relaxation et les articles — et t'abonner quand tu
      voudras débloquer l'intégralité du catalogue.</p>
    """
    send_email(email, "Bienvenue sur FitZen 👋", render_email_shell(
        "Ton compte FitZen est prêt 🎉", body, cta_label="Explorer FitZen", cta_href=f"{APP_BASE_URL}/#/videos"
    ))

    return jsonify({"user": user_to_dict(row)})


@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    row = find_user_by_email(email)
    if not row or not row["password_hash"] or not check_password_hash(row["password_hash"], password):
        return jsonify({"error": "invalid_credentials", "message": "Email ou mot de passe incorrect."}), 401

    session["user_id"] = row["id"]
    return jsonify({"user": user_to_dict(row)})


@app.route("/api/auth/google", methods=["POST"])
def auth_google():
    if not GOOGLE_CLIENT_ID:
        return jsonify({"error": "google_not_configured"}), 503
    data = request.get_json(force=True) or {}
    credential = data.get("credential") or ""
    if not credential:
        return jsonify({"error": "missing_credential"}), 400

    try:
        res = requests.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": credential}, timeout=10)
    except requests.RequestException:
        return jsonify({"error": "google_unreachable"}), 502
    if not res.ok:
        return jsonify({"error": "invalid_google_token"}), 401

    payload = res.json()
    if payload.get("aud") != GOOGLE_CLIENT_ID or payload.get("email_verified") not in ("true", True):
        return jsonify({"error": "invalid_google_token"}), 401

    email = payload["email"].lower()
    name = payload.get("name") or email.split("@")[0]
    google_id = payload["sub"]

    row = find_user_by_email(email)
    is_new = row is None
    if is_new:
        row = create_user(name, email, google_id=google_id)
    elif not row["google_id"]:
        conn = get_db()
        conn.execute("UPDATE users SET google_id = ? WHERE id = ?", (google_id, row["id"]))
        conn.commit()
        conn.close()

    session["user_id"] = row["id"]

    if is_new:
        save_subscriber(email, name)
        body = f"""
          <p>Salut {name} 👋</p>
          <p>Ton compte FitZen (connecté via Google) vient d'être créé. Tu peux dès maintenant
          explorer les vidéos gratuites, les audios de relaxation et les articles.</p>
        """
        send_email(email, "Bienvenue sur FitZen 👋", render_email_shell(
            "Ton compte FitZen est prêt 🎉", body, cta_label="Explorer FitZen", cta_href=f"{APP_BASE_URL}/#/videos"
        ))

    return jsonify({"user": user_to_dict(row)})


@app.route("/api/auth/logout", methods=["POST"])
def auth_logout():
    session.pop("user_id", None)
    return jsonify({"ok": True})


@app.route("/api/auth/me")
def auth_me():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"user": None})
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return jsonify({"user": user_to_dict(row) if row else None})


@app.route("/api/create-checkout-session", methods=["POST"])
def create_checkout_session():
    if not stripe_configured():
        return jsonify({"error": "stripe_not_configured",
                         "message": "Le serveur n'a pas encore de clés Stripe valides. Voir server/README.md."}), 503

    data = request.get_json(force=True) or {}
    plan = data.get("plan")
    email = (data.get("email") or "").strip()
    name = (data.get("name") or "").strip()

    if plan not in PLAN_PRICE_IDS:
        return jsonify({"error": "invalid_plan"}), 400
    if not email:
        return jsonify({"error": "missing_email"}), 400

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{"price": PLAN_PRICE_IDS[plan], "quantity": 1}],
            customer_email=email,
            client_reference_id=name or email,
            success_url=f"{APP_BASE_URL}/#/abonnement?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{APP_BASE_URL}/#/abonnement?canceled=1",
            metadata={"plan": plan, "name": name},
        )
        return jsonify({"url": session.url, "id": session.id})
    except stripe.error.StripeError as e:
        log.exception("Stripe error creating checkout session")
        return jsonify({"error": "stripe_error", "message": str(e)}), 400


SESSION_PRICE_CENTS = 300  # 3,00 € — montant fixé côté serveur, jamais fourni par le client.


@app.route("/api/create-session-checkout", methods=["POST"])
def create_session_checkout():
    if not stripe_configured():
        return jsonify({"error": "stripe_not_configured",
                         "message": "Le serveur n'a pas encore de clés Stripe valides. Voir server/README.md."}), 503

    data = request.get_json(force=True) or {}
    content_type = data.get("contentType")
    content_id = data.get("contentId")
    content_title = (data.get("contentTitle") or "Séance FitZen").strip()
    email = (data.get("email") or "").strip()

    if content_type not in ("video", "audio", "article") or not content_id:
        return jsonify({"error": "invalid_content"}), 400
    if not email:
        return jsonify({"error": "missing_email"}), 400

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "unit_amount": SESSION_PRICE_CENTS,
                    "product_data": {"name": f"FitZen — accès à la séance : {content_title}"},
                },
                "quantity": 1,
            }],
            customer_email=email,
            success_url=f"{APP_BASE_URL}/#/{content_type}s/{content_id}?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{APP_BASE_URL}/#/{content_type}s/{content_id}?canceled=1",
            metadata={"kind": "session_purchase", "contentType": content_type, "contentId": content_id},
        )
        return jsonify({"url": session.url, "id": session.id})
    except stripe.error.StripeError as e:
        log.exception("Stripe error creating session checkout")
        return jsonify({"error": "stripe_error", "message": str(e)}), 400


@app.route("/api/checkout-session/<session_id>")
def get_checkout_session(session_id):
    if not stripe_configured():
        return jsonify({"error": "stripe_not_configured"}), 503
    try:
        session = stripe.checkout.Session.retrieve(session_id, expand=["subscription", "customer"])
    except stripe.error.StripeError as e:
        return jsonify({"error": "stripe_error", "message": str(e)}), 400

    sub = session.subscription
    metadata = session.metadata.to_dict() if session.metadata else {}
    result = {
        "paymentStatus": session.payment_status,
        "customerId": session.customer.id if session.customer else None,
        "customerEmail": session.customer_details.email if session.customer_details else None,
        "plan": metadata.get("plan"),
        "kind": metadata.get("kind"),
        "contentType": metadata.get("contentType"),
        "contentId": metadata.get("contentId"),
    }
    if sub:
        # Depuis l'API Stripe "basil" (2025-03-31), current_period_end vit sur chaque
        # ligne d'abonnement (items.data[]), plus sur l'abonnement lui-même.
        first_item = sub.items.data[0] if sub.items and sub.items.data else None
        result.update({
            "subscriptionId": sub.id,
            "status": sub.status,
            "currentPeriodEnd": first_item.current_period_end if first_item else None,
            "cancelAtPeriodEnd": sub.cancel_at_period_end,
        })
        if sub.status in ("active", "trialing") and result["customerEmail"]:
            maybe_send_welcome_email(
                session_id=session_id,
                to_email=result["customerEmail"],
                name=metadata.get("name") or "",
                plan=metadata.get("plan"),
                current_period_end=result["currentPeriodEnd"],
            )
    return jsonify(result)


@app.route("/api/cancel-subscription", methods=["POST"])
def cancel_subscription():
    if not stripe_configured():
        return jsonify({"error": "stripe_not_configured"}), 503
    data = request.get_json(force=True) or {}
    subscription_id = data.get("subscriptionId")
    if not subscription_id:
        return jsonify({"error": "missing_subscription_id"}), 400
    try:
        sub = stripe.Subscription.modify(subscription_id, cancel_at_period_end=True)
        first_item = sub.items.data[0] if sub.items and sub.items.data else None
        return jsonify({
            "status": sub.status,
            "cancelAtPeriodEnd": sub.cancel_at_period_end,
            "currentPeriodEnd": first_item.current_period_end if first_item else None,
        })
    except stripe.error.StripeError as e:
        return jsonify({"error": "stripe_error", "message": str(e)}), 400


CONTACT_EMAIL = "voyancestar@gmail.com"


@app.route("/api/comments/<content_type>/<content_id>")
def list_comments(content_type, content_id):
    if content_type not in ("video", "audio", "article"):
        return jsonify({"error": "invalid_content_type"}), 400
    conn = get_db()
    rows = conn.execute(
        "SELECT id, user_name, text, created_at FROM comments "
        "WHERE content_type = ? AND content_id = ? ORDER BY created_at DESC",
        (content_type, content_id),
    ).fetchall()
    conn.close()
    return jsonify({"comments": [dict(r) for r in rows]})


@app.route("/api/comments", methods=["POST"])
def create_comment():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "login_required", "message": "Connecte-toi pour laisser un commentaire."}), 401

    data = request.get_json(force=True) or {}
    content_type = data.get("contentType")
    content_id = data.get("contentId")
    text = (data.get("text") or "").strip()

    if content_type not in ("video", "audio", "article") or not content_id:
        return jsonify({"error": "invalid_content"}), 400
    if not text:
        return jsonify({"error": "empty_comment", "message": "Le commentaire ne peut pas être vide."}), 400
    if len(text) > 1000:
        return jsonify({"error": "comment_too_long", "message": "Commentaire trop long (1000 caractères max)."}), 400

    conn = get_db()
    user_row = conn.execute("SELECT name FROM users WHERE id = ?", (user_id,)).fetchone()
    user_name = user_row["name"] if user_row else "Utilisateur"
    cur = conn.execute(
        "INSERT INTO comments (content_type, content_id, user_id, user_name, text) VALUES (?, ?, ?, ?, ?)",
        (content_type, content_id, user_id, user_name, text),
    )
    conn.commit()
    row = conn.execute("SELECT id, user_name, text, created_at FROM comments WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return jsonify({"comment": dict(row)})


@app.route("/api/comments/<int:comment_id>", methods=["DELETE"])
def delete_comment(comment_id):
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "login_required"}), 401
    conn = get_db()
    row = conn.execute("SELECT user_id FROM comments WHERE id = ?", (comment_id,)).fetchone()
    if not row or row["user_id"] != user_id:
        conn.close()
        return jsonify({"error": "not_found_or_forbidden"}), 404
    conn.execute("DELETE FROM comments WHERE id = ?", (comment_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# ---------- Service client (contact) ----------

@app.route("/api/contact", methods=["POST"])
def contact():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    message = (data.get("message") or "").strip()

    if not name or not email or "@" not in email:
        return jsonify({"error": "invalid_input", "message": "Nom ou email invalide."}), 400
    if not message:
        return jsonify({"error": "empty_message", "message": "Le message ne peut pas être vide."}), 400
    if len(message) > 4000:
        return jsonify({"error": "message_too_long", "message": "Message trop long (4000 caractères max)."}), 400

    safe_message = message.replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br>")
    body = f"""
      <p><strong>De :</strong> {name} ({email})</p>
      <p style="margin-top:16px; white-space:pre-wrap;">{safe_message}</p>
    """
    sent = send_email(
        CONTACT_EMAIL,
        f"Nouveau message de contact FitZen — {name}",
        render_email_shell("Nouveau message via le formulaire de contact", body, cta_label="Répondre", cta_href=f"mailto:{email}"),
    )
    if not sent:
        return jsonify({"error": "send_failed", "message": "L'envoi a échoué, réessaie plus tard."}), 502
    return jsonify({"ok": True})


@app.route("/api/register-subscriber", methods=["POST"])
def register_subscriber():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip()
    name = (data.get("name") or "").strip()
    if not email or "@" not in email:
        return jsonify({"error": "invalid_email"}), 400
    save_subscriber(email, name)
    return jsonify({"ok": True})


@app.route("/api/stripe-webhook", methods=["POST"])
def stripe_webhook():
    payload = request.data
    sig_header = request.headers.get("Stripe-Signature", "")
    if not STRIPE_WEBHOOK_SECRET:
        return jsonify({"error": "webhook_not_configured"}), 503
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        return jsonify({"error": "invalid_signature"}), 400

    log.info("Stripe webhook received: %s", event["type"])
    # Sans base de données, on se contente de journaliser l'évènement ici.
    # En production : mettre à jour le statut d'abonnement de l'utilisateur en base
    # sur "checkout.session.completed", "customer.subscription.updated/deleted".
    return jsonify({"received": True})


# ---------- Pexels videos (contenu vidéo réel, libre de droits) ----------

PEXELS_SEARCH_URL = "https://api.pexels.com/videos/search"
_video_cache = {}
CACHE_TTL_SECONDS = 3600


@app.route("/api/videos")
def videos():
    query = request.args.get("query", "yoga")
    per_page = min(int(request.args.get("per_page", 6)), 15)

    if not PEXELS_API_KEY:
        return jsonify({"error": "pexels_not_configured",
                         "message": "PEXELS_API_KEY manquante. Voir server/README.md."}), 503

    cache_key = f"{query}:{per_page}"
    cached = _video_cache.get(cache_key)
    if cached and time.time() - cached["ts"] < CACHE_TTL_SECONDS:
        return jsonify(cached["data"])

    try:
        resp = requests.get(
            PEXELS_SEARCH_URL,
            headers={"Authorization": PEXELS_API_KEY},
            params={"query": query, "per_page": per_page, "orientation": "landscape"},
            timeout=10,
        )
        resp.raise_for_status()
        raw = resp.json()
    except requests.RequestException as e:
        log.exception("Pexels API error")
        return jsonify({"error": "pexels_error", "message": str(e)}), 502

    results = []
    for v in raw.get("videos", []):
        files = sorted(
            [f for f in v.get("video_files", []) if f.get("file_type") == "video/mp4"],
            key=lambda f: f.get("width", 0),
        )
        sd_file = next((f for f in files if f.get("width", 0) <= 960), files[0] if files else None)
        if not sd_file:
            continue
        results.append({
            "id": str(v["id"]),
            "durationSeconds": v.get("duration"),
            "thumbnail": v.get("image"),
            "src": sd_file["link"],
            "author": v.get("user", {}).get("name"),
            "sourceUrl": v.get("url"),
        })

    data = {"query": query, "results": results}
    _video_cache[cache_key] = {"ts": time.time(), "data": data}
    return jsonify(data)


init_db()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8420))
    if not stripe_configured():
        log.warning("Stripe n'est pas configuré (clés manquantes dans .env) — le paiement réel est désactivé.")
    if not PEXELS_API_KEY:
        log.warning("PEXELS_API_KEY manquante dans .env — les vraies vidéos ne seront pas chargées.")
    if not GOOGLE_CLIENT_ID:
        log.warning("GOOGLE_CLIENT_ID manquante dans .env — la connexion Google est désactivée.")
    app.run(host="0.0.0.0", port=port, debug=True)
