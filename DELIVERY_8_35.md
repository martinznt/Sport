# Version 8.35.0 — préparée sur la branche, non fusionnée, non déployée

## État

- **`main`** reste en 8.34.1 (fusion de la PR #25). Rien n'a été fusionné ni déployé depuis.
- **8.35.0** est sur la branche `claude/new-session-wi9olv` (et sa copie `claude/site-apres-audit-playwright`). Elle contient la 8.34.2 (corrections de l'audit Playwright) puis tout ce qui suit.
- Aucune opération Cloudflare, aucune annonce « Envoyer à tous ». Le ZIP « site sport final » est remis pour relecture.
- La liste complète de tes demandes, avec l'état de chacune et l'endroit où la vérifier, est dans [docs/DEMANDES_8_35.md](docs/DEMANDES_8_35.md).

## Ce que contient la 8.35.0

**Phases et créateur de séance**
- Profil › 🧩 **Mes phases** (avant : Bibliothèque › Mes moments) : une phase se crée en quelques secondes (nom, sport, moment, durée, exercice ou simple consigne). Quand tu crées une séance de ce sport, toutes tes phases sont proposées ; un toucher les ajoute.
- Une phase **sans exercices** : « Pas d'exercices pour cette phase » ; l'app propose un message (ex. spray wall), tu le changes comme tu veux.
- Étape 1 : des **cases « ce que je choisis moi-même »** (durées des phases, phases, objectifs…) à la place de « précis / très précis » ; elles restent en bas de chaque étape pour changer d'avis. « Modifiable / l'app choisit / bloqué » remplacé par un simple « ✏️ modifié par toi ».
- **Retirer après coup** un exercice (✕) ou une phase, sans revenir en arrière ; revenir en arrière garde exactement la même organisation.
- « Tes objectifs » : l'essentiel visible (liste, ↑ ↓ ✕, une phrase), les réglages fins rangés dans « Plus de réglages ».

**Étirements** (Bibliothèque › 🧘 Étirements)
- Pour quelle séance, quelles zones (cochées d'après les exercices de la séance), quel lieu et quel matériel, combien de temps après, pendant combien de temps : l'app prépare la séance d'étirement.
- « 📌 Me la proposer après … » : plusieurs séances d'étirement possibles par séance, visibles sur la page de la séance.
- À la fin de la séance : « Maintenant », « Dans 15 min »… : programmé dans le calendrier, avec un rappel qui ouvre et lance la séance d'étirement.
- Limite : une app web ne peut pas savoir que tu es arrivé chez toi (pas de localisation en arrière-plan) ; c'est le rappel à l'heure choisie qui la lance.

**Objectifs** (Profil › Objectifs › « ＋ Ajouter un objectif »)
- « Que veux-tu ? » en six grands boutons (niveau d'escalade, bloc ou voie précis, un chiffre, une figure, la régularité, avec tes mots), puis deux ou trois choix. La cible est proposée d'après ta dernière valeur réelle ; sans valeur notée, tu l'écris (rien n'est inventé). Une phrase résume l'objectif avant de l'enregistrer.

**Clarté**
- Une seule interface, la **simple** : le choix « Avancée » est retiré.
- **Mesures** expliquées (« un chiffre que tu suis dans le temps ») ; un seul nom (« mesure ») ; les mesures personnalisées sont dans Profil › Records et mesures.
- **Doublons retirés** : Progrès (Records, Mon analyse), Mes sports (mesures), « À mesurer » (bilan / records), poids et mensurations (Mon corps), noms différents des rubriques de la Bibliothèque.
- **Petits messages en italique** « … va dans Profil › Mes lieux » : le chemin est un lien qui y mène, et « ‹ Retour » ramène à la page de départ.
- Une fenêtre ne clignote plus à chaque choix.

**Séance en cours** : en bas de l'écran, même pendant l'effort, le prochain exercice et son nombre de séries.

**Sources** : un repère « 📚 Sources » avec l'icône de chaque site (PubMed, BMJ, Springer…). Un toucher montre tous les liens. « 🎯 Voir le passage » ouvre la source à la phrase exacte, surlignée : c'est le serveur qui la lit dans le vrai résumé PubMed (il ne l'écrit jamais lui-même). Sur chaque exercice : ce qui vient de la pratique d'entraînement est dit tel quel, et chaque règle (séries, repos, doigts, échauffement, étirements, intervalles) renvoie aux études qui l'appuient.

**Captures d'écran**
- Jointes à « Signaler un bug » et « Proposer une amélioration » (2 au plus, réduites sur le téléphone). Le serveur vérifie que ce sont de vraies images. Seuls les administrateurs du bon rôle les voient. Elles sont effacées avec le compte, et au plus tard au bout d'un an.
- Assistant du site (administrateurs) : une capture jointe est analysée (modèle Gemini nécessaire) ; « 🔎 Analyser avec l'assistant » depuis un signalement ; les demandes courtes (« rends ça plus clair ») sont traitées directement.

**Assistant pour les membres** : plus aucun nom de fournisseur ni le mot « IA » affichés. L'assistant ne prétend jamais être une personne. Le partage du profil reste un choix explicite (« service externe »).

## Vérifications faites

⟦VERIFICATIONS⟧

## Ce qui n'a pas pu être vérifié ici

- **Les vraies sources en ligne** : le réseau de cet environnement bloque PubMed et les éditeurs. La recherche du passage exact est vérifiée avec un faux résumé PubMed (tests), pas sur le vrai site. En ligne, si PubMed ne répond pas, le lien ouvre simplement le résumé de l'article.
- Firefox et Safari (WebKit) : non installés ici. Le vrai site, la vraie base D1, Gemini et Workers AI réels, les notifications sur de vrais téléphones, un vrai lecteur d'écran.

## À faire de ton côté, quand tu seras satisfait

1. **Relire** le ZIP (« site sport final.zip ») et la liste [docs/DEMANDES_8_35.md](docs/DEMANDES_8_35.md). Rien n'est fusionné ni déployé.
2. **Publier** (quand tu le décides) : Pull Request de `claude/new-session-wi9olv` vers `main`, attendre la CI « Tests » verte, fusionner. La fusion déclenche le déploiement automatique déjà en place.
3. **Cloudflare : rien d'obligatoire.** La nouvelle table des captures se crée seule, sans rien supprimer. Pas de nouvelle variable obligatoire.

### Relier Gemini toi-même (pour l'assistant, et indispensable pour analyser les captures)

1. Va sur **Google AI Studio** (https://aistudio.google.com/), connecte-toi, choisis ou crée un **projet sans facturation activée**, puis **Get API key → Create API key**. Copie la clé (elle commence par `AIza…`). Ne la colle jamais dans une conversation, dans GitHub ni dans un fichier.
2. Va sur **Cloudflare** (https://dash.cloudflare.com/) → **Workers & Pages** → ton Worker **`seances-entrainement`** → **Settings** → **Variables and Secrets** → **Add**.
3. Choisis le type **Secret**, nom **`GEMINI_API_KEY`**, valeur = la clé copiée → **Deploy** (ou **Save**). Le site ne redémarre pas autrement : la clé est lue au prochain appel.
4. Dans l'app, connecté en administrateur (rôle Intelligence ou Super-administrateur) : **Paramètres › Administration › Assistant du site** → déplie **« Modèle et réserve gratuite »** → choisis **Gemini** → **Enregistrer** → **Tester**. Le message doit dire que l'assistant répond.
5. Pour vérifier les captures : ouvre un signalement qui en a une → **« 🔎 Analyser avec l'assistant »** → **Envoyer**.

Ce que voient les membres : « l'assistant », sans le nom Gemini ni le mot IA. Si Google refuse la clé ou le modèle, l'assistant affiche un message clair aux administrateurs et rien n'est appliqué. Sans clé Gemini, l'assistant continue avec Workers AI, déjà relié au Worker ; seule l'analyse des captures demande Gemini.

### Le reste

- **Strava (facultatif)** : inchangé, voir [CLOUDFLARE_GUIDE.md](CLOUDFLARE_GUIDE.md).
- **L'annonce « Envoyer à tous »** : à envoyer toi-même, si tu le souhaites, depuis Paramètres › Administration.

Site : https://seances-sport.pages.dev/
