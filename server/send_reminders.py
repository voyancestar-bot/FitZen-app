"""
Envoie un email de rappel ("tu nous manques") à tous les profils créés dans l'app.

À exécuter manuellement, ou via une tâche planifiée (cron, Tâches planifiées
Windows...) sur une machine allumée en permanence — ce serveur de démo ne tourne
que quand tu le lances, il ne peut pas envoyer d'emails "tout seul" en arrière-plan.

Usage :
    source venv/bin/activate
    python3 server/send_reminders.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from server import load_subscribers, render_email_shell, send_email, APP_BASE_URL  # noqa: E402

REMINDER_PHRASES = [
    "Ton tapis de yoga s'ennuie sans toi 🧘",
    "5 minutes suffisent pour te sentir mieux aujourd'hui.",
    "Ta prochaine séance t'attend, prête en moins de 20 minutes.",
    "Petit pas, grand effet : reviens quand tu veux, sans pression.",
]


def build_reminder_html(name):
    import random
    greeting = f"Salut {name} 👋" if name else "Salut 👋"
    phrase = random.choice(REMINDER_PHRASES)
    body = f"""
      <p>{greeting}</p>
      <p>{phrase}</p>
      <p>On a ajouté de nouvelles séances et de nouveaux articles depuis ta dernière visite.
      Ça te dit une petite pause bien-être aujourd'hui ?</p>
    """
    return render_email_shell(
        "On te manque sur FitZen 🌿",
        body,
        cta_label="Retourner sur FitZen",
        cta_href=f"{APP_BASE_URL}/#/videos",
    )


def main():
    subscribers = load_subscribers()
    if not subscribers:
        print("Aucun abonné enregistré (server/subscribers.json vide ou absent).")
        return

    print(f"Envoi de rappels à {len(subscribers)} profil(s)...")
    sent = 0
    for sub in subscribers:
        html = build_reminder_html(sub.get("name", ""))
        ok = send_email(sub["email"], "On te manque sur FitZen 🌿", html)
        if ok:
            sent += 1
    print(f"Terminé : {sent}/{len(subscribers)} email(s) envoyé(s).")


if __name__ == "__main__":
    main()
