// Contenu de démo pour l'app FitZen. En production, ces données viendraient d'une API/CMS.

const VIDEOS = [
  {
    id: "v1",
    title: "Yoga du matin - Réveil en douceur",
    category: "Yoga",
    duration: "30 min",
    level: "Débutant",
    free: true,
    color: "grad-1",
    icon: "🧘",
    description: "Une séance complète et douce, en français, pour réveiller le corps et l'esprit, idéale pour commencer la journée avec énergie et calme.",
    youtubeId: "W0ai9v6R6ks"
  },
  {
    id: "v2",
    title: "HIIT Full Body - Low Impact, sans saut",
    category: "HIIT",
    duration: "20 min",
    level: "Débutant",
    free: true,
    color: "grad-2",
    icon: "🔥",
    description: "Un entraînement en français, à intensité modérée, sans saut ni impact, pour brûler des calories en douceur — accessible à tous les niveaux.",
    youtubeId: "CLQhHC0nKVs"
  },
  {
    id: "v3",
    title: "Renforcement abdos & gainage",
    category: "Renforcement",
    duration: "20 min",
    level: "Tous niveaux",
    free: true,
    color: "grad-3",
    icon: "💪",
    description: "Un programme en français, ciblé, pour sculpter et renforcer votre sangle abdominale, sans matériel, à suivre en temps réel.",
    youtubeId: "LcnTM8aC49k"
  },
  {
    id: "v4",
    title: "Cardio Dance - Fun & efficace",
    category: "Cardio",
    duration: "39 min",
    level: "Tous niveaux",
    free: false,
    color: "grad-4",
    icon: "💃",
    description: "Brûlez des calories en dansant sur des rythmes entraînants, en français, sans même vous en rendre compte.",
    youtubeId: "mubHVTB_M68"
  },
  {
    id: "v5",
    title: "Pilates - Posture & souplesse",
    category: "Pilates",
    duration: "30 min",
    level: "Intermédiaire",
    free: false,
    color: "grad-5",
    icon: "🤸",
    description: "Travaillez votre posture, votre gainage profond et votre souplesse avec cette séance complète de Pilates, en français.",
    youtubeId: "jUzGt72ZFEo"
  },
  {
    id: "v6",
    title: "Étirements complets post-training",
    category: "Étirements",
    duration: "20 min",
    level: "Tous niveaux",
    free: false,
    color: "grad-6",
    icon: "🙆",
    description: "Une routine d'étirements en français pour récupérer efficacement après vos séances de sport, en douceur.",
    youtubeId: "gOe1ChSI1fE"
  },
  {
    id: "v7",
    title: "Boxe fitness - Cardio débutant",
    category: "Cardio",
    duration: "20 min",
    level: "Débutant",
    free: false,
    color: "grad-2",
    icon: "🥊",
    description: "Une séance de cardio boxe en français, sans matériel, pour un cardio efficace et accessible.",
    youtubeId: "mJffU7KypDw"
  },
  {
    id: "v8",
    title: "Yoga du soir - Relaxation profonde",
    category: "Yoga",
    duration: "41 min",
    level: "Débutant",
    free: false,
    color: "grad-1",
    icon: "🌙",
    description: "Terminez votre journée avec une séance de yoga apaisante en français, pour favoriser un sommeil réparateur.",
    youtubeId: "_bev05G6bDI"
  },
  {
    id: "v9",
    title: "Perte de poids débutant - Spécial minceur",
    category: "Minceur",
    duration: "28 min",
    level: "Débutant",
    free: true,
    color: "grad-4",
    icon: "🔥",
    description: "Une séance complète en français, sans matériel et sans saut, pensée pour démarrer en douceur un objectif minceur.",
    youtubeId: "SXjZyhFFDMg"
  },
  {
    id: "v10",
    title: "HIIT débutant sans impact - Spécial minceur",
    category: "Minceur",
    duration: "20 min",
    level: "Débutant",
    free: false,
    color: "grad-2",
    icon: "🔥",
    description: "Un entraînement HIIT en français, sans sauts ni impact, pour brûler des calories efficacement même en débutant.",
    youtubeId: "n5ssltwyvQk"
  }
];

const AUDIOS = [
  {
    id: "a1",
    title: "Méditation guidée - Pleine conscience",
    category: "Méditation",
    duration: "10 min",
    free: true,
    color: "grad-3",
    icon: "🧠",
    description: "Une méditation guidée en français (voix, sans musique) pour ancrer votre attention dans l'instant présent et calmer le mental.",
    youtubeId: "PTsk8VHCZjM"
  },
  {
    id: "a2",
    title: "Respiration cohérence cardiaque",
    category: "Respiration",
    duration: "5 min",
    free: true,
    color: "grad-4",
    icon: "🌬️",
    description: "Un exercice de respiration guidée en français (voix) pour réduire le stress et l'anxiété en quelques minutes.",
    youtubeId: "AWDBEBy3Q9w"
  },
  {
    id: "a3",
    title: "Sons de la forêt - Ambiance nature",
    category: "Nature",
    duration: "53 min",
    free: false,
    color: "grad-1",
    icon: "🌲",
    description: "De vrais sons de forêt enregistrés (chants d'oiseaux, aucune musique ajoutée) pour se relaxer, étudier ou s'endormir.",
    youtubeId: "e_-9sIiDxVU"
  },
  {
    id: "a4",
    title: "Sommeil profond - Voyage guidé",
    category: "Sommeil",
    duration: "67 min",
    free: false,
    color: "grad-6",
    icon: "😴",
    description: "Une méditation parlée en français pour vous accompagner doucement vers un sommeil profond et réparateur.",
    youtubeId: "dhz_STOU-C0",
    previewStart: 45
  },
  {
    id: "a5",
    title: "Anti-stress express avant le travail",
    category: "Méditation",
    duration: "4 min",
    free: false,
    color: "grad-3",
    icon: "☕",
    description: "Une courte séance parlée en français pour relâcher les tensions avant une journée chargée.",
    youtubeId: "08XTI1PSn4A"
  },
  {
    id: "a6",
    title: "Pluie douce & vagues océan",
    category: "Nature",
    duration: "10 min",
    free: false,
    color: "grad-5",
    icon: "🌊",
    description: "Un vrai enregistrement de pluie et de vagues (aucune musique ajoutée) pour favoriser la détente profonde.",
    youtubeId: "YiVpLX4TGQc"
  }
];

const ARTICLES = [
  {
    id: "r1",
    title: "5 habitudes simples pour plus d'énergie au quotidien",
    category: "Motivation",
    readTime: "4 min",
    free: true,
    color: "grad-2",
    icon: "⚡",
    excerpt: "De petits changements dans votre routine peuvent transformer votre niveau d'énergie sur le long terme.",
    content: `Beaucoup pensent qu'il faut bouleverser toute sa vie pour se sentir plus énergique. En réalité, ce sont souvent de petites habitudes répétées chaque jour qui font la différence.

1. Buvez un grand verre d'eau au réveil : après une nuit de sommeil, votre corps est légèrement déshydraté. Réhydrater dès le matin relance le métabolisme.

2. Exposez-vous à la lumière naturelle dans les 30 premières minutes après le réveil : cela aide à réguler votre horloge biologique et améliore la qualité du sommeil suivant.

3. Bougez au moins 10 minutes, même sans "faire du sport" : une marche rapide ou quelques étirements suffisent à activer la circulation.

4. Mangez moins de sucres rapides le matin : ils provoquent un pic puis une chute d'énergie en fin de matinée.

5. Priorisez 3 tâches maximum par jour : la surcharge mentale est l'une des premières causes de fatigue perçue.

L'énergie ne se décrète pas, elle se construit jour après jour par la répétition de petits gestes simples.`
  },
  {
    id: "r2",
    title: "Comprendre la récupération musculaire",
    category: "Récupération",
    readTime: "6 min",
    free: true,
    color: "grad-1",
    icon: "🦵",
    excerpt: "Pourquoi le repos fait partie intégrante de votre progression sportive, et comment l'optimiser.",
    content: `La récupération est souvent le grand oublié des programmes d'entraînement. Pourtant, c'est pendant le repos que le corps se répare et progresse réellement.

Quand vous vous entraînez, vous créez de micro-lésions dans les fibres musculaires. C'est la phase de récupération qui permet leur reconstruction, avec un léger surplus de résistance : c'est le principe de surcompensation.

Pour optimiser votre récupération :
- Dormez entre 7 et 9 heures par nuit, le sommeil profond étant le moment clé de la réparation tissulaire.
- Hydratez-vous suffisamment, l'eau étant essentielle au transport des nutriments vers les muscles.
- Consommez des protéines de qualité dans les heures suivant l'effort.
- Alternez les groupes musculaires sollicités d'une séance à l'autre.
- N'ignorez pas les signaux de fatigue excessive, qui peuvent annoncer un surentraînement.

Un corps bien récupéré est un corps qui progresse plus vite et se blesse moins.`
  },
  {
    id: "r3",
    title: "Nutrition : que manger avant et après le sport ?",
    category: "Nutrition",
    readTime: "5 min",
    free: false,
    color: "grad-4",
    icon: "🥗",
    excerpt: "Les bons choix alimentaires autour de l'effort pour optimiser vos performances et votre récupération.",
    content: `L'alimentation autour de l'entraînement joue un rôle clé dans vos performances et votre récupération.

Avant l'effort (1h30 à 2h avant) :
Privilégiez des glucides complexes à index glycémique modéré (flocons d'avoine, riz, pain complet) associés à une petite portion de protéines. Évitez les repas trop gras ou trop riches en fibres juste avant, qui ralentissent la digestion.

Pendant l'effort (si plus de 60-90 minutes) :
Une hydratation régulière suffit généralement pour des séances courtes. Pour les efforts longs, des glucides rapides peuvent être utiles.

Après l'effort (dans les 30 à 60 minutes) :
C'est la fenêtre metabolique idéale pour associer protéines (pour la réparation musculaire) et glucides (pour reconstituer les réserves de glycogène). Un exemple simple : yaourt grec, banane et une poignée d'amandes.

L'essentiel reste la régularité et l'écoute de votre corps : chaque organisme réagit différemment selon son métabolisme et le type d'effort pratiqué.`
  },
  {
    id: "r4",
    title: "Le sommeil, pilier invisible de la performance",
    category: "Sommeil",
    readTime: "7 min",
    free: false,
    color: "grad-6",
    icon: "🌙",
    excerpt: "Pourquoi bien dormir est aussi important que bien s'entraîner, et comment améliorer vos nuits.",
    content: `On investit souvent beaucoup d'énergie dans l'entraînement et l'alimentation, en négligeant un pilier fondamental : le sommeil.

Pendant le sommeil profond, le corps libère l'hormone de croissance, essentielle à la réparation musculaire et à la régulation hormonale. Un manque de sommeil chronique augmente le cortisol (hormone du stress), favorise le stockage des graisses et diminue la motivation à l'effort.

Quelques leviers pour améliorer la qualité de votre sommeil :
- Gardez des horaires de coucher et de lever réguliers, même le week-end.
- Évitez les écrans dans l'heure précédant le coucher, la lumière bleue retardant la sécrétion de mélatonine.
- Maintenez une température de chambre fraîche, autour de 18-19°C.
- Limitez la caféine après 14h.
- Privilégiez une activité physique régulière, mais évitez les séances très intenses juste avant le coucher.

Dormir suffisamment n'est pas une option, c'est une partie intégrante de votre entraînement.`
  },
  {
    id: "r5",
    title: "Gérer le stress mental face aux objectifs sportifs",
    category: "Mental",
    readTime: "5 min",
    free: false,
    color: "grad-3",
    icon: "🧘‍♂️",
    excerpt: "Comment garder une relation saine avec ses objectifs sans tomber dans la pression excessive.",
    content: `La motivation sportive peut parfois se transformer en source de stress lorsque les objectifs deviennent une pression constante.

Voici quelques principes pour garder un rapport sain à vos objectifs :

1. Distinguez objectifs de résultat et objectifs de processus. Se concentrer sur ce que vous contrôlez réellement (régularité, effort, technique) réduit l'anxiété liée aux résultats, souvent influencés par de nombreux facteurs externes.

2. Célébrez les petites victoires. Progresser n'est jamais linéaire : reconnaître les avancées, même modestes, entretient la motivation sur le long terme.

3. Autorisez-vous des jours de moins bonne forme. La performance fluctue naturellement selon le sommeil, le stress, l'alimentation. Ce n'est pas un échec, c'est une donnée normale.

4. Pratiquez l'auto-compassion plutôt que l'autocritique sévère, qui est souvent contre-productive et augmente le risque d'abandon.

Un mental apaisé est un allié de performance bien plus puissant qu'une pression constante.`
  },
  {
    id: "r6",
    title: "Pourquoi s'échauffer change tout",
    category: "Technique",
    readTime: "3 min",
    free: false,
    color: "grad-5",
    icon: "🔄",
    excerpt: "Un échauffement bien construit réduit les blessures et améliore vos performances dès les premières minutes.",
    content: `L'échauffement est souvent négligé, pourtant il conditionne la qualité et la sécurité de toute votre séance.

Un bon échauffement remplit plusieurs fonctions :
- Augmenter progressivement la température corporelle et musculaire, ce qui améliore l'élasticité des tissus.
- Préparer le système cardiovasculaire à l'effort, en augmentant progressivement la fréquence cardiaque.
- Activer les connexions neuromusculaires nécessaires aux mouvements spécifiques de votre séance.
- Réduire significativement le risque de blessure, notamment musculaire et tendineuse.

Un échauffement efficace dure généralement entre 8 et 12 minutes et comprend une phase cardiovasculaire légère, une mobilisation articulaire, puis des mouvements spécifiques proches de ceux de la séance à venir.

Ne le voyez pas comme une perte de temps, mais comme un investissement direct dans la qualité de votre entraînement.`
  }
];

const PLANS = {
  monthly: { id: "monthly", label: "Mensuel", price: 9.99, period: "/mois" },
  annual: { id: "annual", label: "Annuel", price: 79.99, period: "/an", note: "Soit 6,67 €/mois — 2 mois offerts" }
};
