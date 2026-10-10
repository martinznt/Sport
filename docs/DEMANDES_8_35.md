# Demandes pour la 8.35 — liste tenue à jour

Chaque demande est recopiée telle quelle (résumée quand elle est longue), avec son état et l'endroit où la vérifier.
États : ✅ fait et vérifié dans le navigateur · 🟡 fait, vérification à finir · ⏳ en cours · ⚠️ limite (ce qui n'est pas possible et pourquoi).

## Phases

| Demande | État | Où le voir |
|---|---|---|
| Ajouter des phases très simplement dans mon profil | ✅ | Profil › Mes phases (à l'accueil du Profil) › « ＋ Ajouter une phase » |
| Quand je crée une séance du sport de la phase, l'app me propose toutes mes phases | ✅ | Créer une séance › Ta structure › « 🧩 Mes phases » |
| Simple à programmer | ✅ | même endroit : un bouton ＋ par phase |
| Supprimer des exercices ou des phases après coup, sans revenir en arrière | ✅ | Structure finale et séance proposée : ✕ sur un exercice, « Retirer cette phase » |
| Revenir en arrière garde exactement la même organisation | ✅ | boutons ‹ / › du créateur |
| Une phase sans exercices, avec un message proposé par l'app et modifiable (ex. spray wall) | ✅ | « Pas d'exercices pour cette phase » sur chaque phase |

## Étirements

| Demande | État | Où le voir |
|---|---|---|
| Un endroit « Étirements » à part des exercices | ✅ | Bibliothèque › Étirements |
| En créant une séance, l'app dit où aller pour les étirements | ✅ | dernière étape du créateur : petit message cliquable |
| Choisir muscles, matériel, lieu, et la séance après laquelle s'étirer | ✅ | Bibliothèque › Étirements, étapes 1 à 3 |
| Combien de temps après et pendant combien de temps | ✅ | étapes 4 et 5 |
| L'app fait la séance d'étirement adaptée | ✅ | « 🧘 Préparer mes étirements » |
| Si elle me plaît : « après telle séance je veux ça » | ✅ | « 📌 Me la proposer après … » |
| Plusieurs séances d'étirement disponibles sur la séance | ✅ | page de la séance : « 🧘 Étirements après cette séance » |
| À la fin de ma séance : « dans X minutes », programmé dans le calendrier | ✅ | écran de fin de séance |
| Quand je suis chez moi, ça me la lance | ⚠️ | une app web ne peut pas suivre la position en arrière-plan : le rappel arrive à l'heure choisie et le toucher lance la séance ; app ouverte, elle propose de la lancer |

## Clarté

| Demande | État | Où le voir |
|---|---|---|
| Métriques : expliquer ce que c'est | ✅ | Profil › Records et mesures (texte d'aide), formulaire « Nouvelle mesure » |
| Aucun doublon dans l'app | ✅ | Progrès, Mes sports, À mesurer, poids et mensurations, noms des rubriques de la Bibliothèque ; les raccourcis de l'accueil restent des raccourcis |
| Petits messages en italique « si tu as besoin de …, va dans … » avec le chemin, cliquables | ✅ | une vingtaine d'endroits ; « ‹ Retour » ramène à la page de départ ; un test vérifie que chaque chemin mène à la bonne page |
| Les mettre à tous les endroits liés | 🟡 | lieux, objectifs, phases, étirements, mesures, poids, bilan, exercices, zones à ménager, Progrès ; à compléter selon ton retour |
| App bien organisée, boutons rangés, petits messages pour les choses pas évidentes | 🟡 | boutons longs qui passent à la ligne, réglages fins repliés, explications ajoutées ; à juger sur ton téléphone |

## Créateur de séance

| Demande | État | Où le voir |
|---|---|---|
| À l'étape 1, plus de « précis / très précis » : des cases à cocher (durées des phases, phases, objectifs…) | ✅ | Créer une séance, étape 1 |
| Ces cases en bas de chaque étape, pour changer mes choix | ✅ | bas de chaque étape |
| « Modifiable / l'app choisit / bloqué » remplacé par quelque chose de clair | ✅ | tout se modifie ; « ✏️ modifié par toi » |
| « Faire avec l'app » : l'app propose, je modifie tout simplement | ✅ | « ⚡ Proposer ma séance » donne la séance entière, prête à modifier (✕) ; « ↺ » rend un réglage à l'app |
| Objectifs beaucoup mieux faits et beaucoup plus simples à paramétrer | ✅ | Profil › Objectifs › « ＋ Ajouter un objectif » (en deux temps) ; étape « Tes objectifs » allégée |

## Séance en cours

| Demande | État | Où le voir |
|---|---|---|
| En bas de l'écran, même pendant l'effort : prochain exercice et nombre de séries | ✅ | lecteur de séance |

## Assistant et captures

| Demande | État | Où le voir |
|---|---|---|
| Qu'on ne voie pas que c'est une IA ni que c'est Gemini (côté membres) | ✅ (sauf une ligne) | « l'assistant » partout ; le destinataire des données (Google ou Cloudflare) reste nommé dans « Qui reçoit ta demande ? », replié : c'est une obligation de transparence ; l'assistant ne prétend jamais être une personne |
| Étapes pour relier Gemini, à faire moi-même | ✅ | DELIVERY_8_35.md et message final |
| Assistant admin aussi efficace qu'une vraie conversation (« rends ça plus clair », « ajoute ça ») | 🟡 | Paramètres › Administration › Assistant du site (consignes revues ; à essayer avec la vraie clé Gemini) |
| Joindre une capture d'écran à l'assistant admin, analysée | ✅ (avec Gemini) | même endroit ; vérifié avec une réponse Gemini simulée, pas avec la vraie |
| Capture d'écran jointe aux signalements de bug et aux propositions | ✅ | Paramètres › Signaler un bug ; « Proposer une amélioration » ; chez les admins : 📎 et « 🔎 Analyser avec l'assistant » |

## Ajoutées ensuite

| Demande | État | Où le voir |
|---|---|---|
| Ne rien oublier de tout ce que j'ai dit | ✅ | cette liste |
| Sources fiables pour les exercices, l'assistant…, citées dans l'app : repère « Sources » avec les icônes des sources ; un clic montre tous les liens ; un lien mène directement à l'endroit de l'info | ✅ / ⚠️ | « 📚 Sources » partout où une source est citée, et sur chaque exercice ; « 🎯 Voir le passage » mène à la phrase exacte lue par le serveur sur PubMed. Limite : PubMed est bloqué depuis l'environnement de travail, donc c'est vérifié avec un faux résumé, et la vraie phrase n'apparaîtra qu'en ligne. Pour 102 exercices sur 315 (technique pure), aucune étude n'est citée, et l'app le dit au lieu d'en inventer une |
| Supprimer le choix interface simple / avancée : garder seulement l'interface simple | ✅ | plus aucun choix dans les Paramètres ; un ancien réglage « Avancée » est sans effet |

## Trouvé et corrigé pendant la vérification finale

Le retrait de l'interface avancée (ta demande) avait caché des éléments qui n'existaient que dans l'ancien accueil « avancé ». Les tests de bout en bout les ont révélés ; ils sont revenus dans l'interface simple :

| Ce qui manquait | Où c'est maintenant |
|---|---|
| « Mes phases » et le Carnet d'escalade | Profil (accueil de l'onglet) |
| Le programme en cours | Accueil (avec « ▶ C'est parti » le jour d'une séance) |
| « ✓ Séance enregistrée » : ce que la séance change pour la suite | Accueil, juste après l'enregistrement |
| La « Petite question » du profil | Accueil |
| Le chrono | Accueil › Créer ma séance › « ⏱ Chrono » (et ☰ Menu) |
| « ✍️ Avec tes mots » dans le créateur sans « Mes objectifs » coché | Créer une séance, étape 1 |

Autres défauts corrigés au passage : un choix fait à la main dans une phase (sport, lieu, objectifs) restait grisé ; « ＋ » sur une de tes phases et « Ajouter un échauffement » échouaient quand toutes les durées étaient réglées par toi (la séance s'allonge maintenant, et c'est dit) ; « Qui reçoit ta demande ? » restait sur « pas encore connu » ; « 🔎 Analyser avec l'assistant » ouvrait un message vide ; « Plus de détails sur ma séance » se refermait à chaque choix ; un message pouvait en effacer un autre avant d'être lu ; les messages parlaient encore de réglages « verrouillés ».

## Toujours valables

Pas de déploiement ni de fusion dans `main` : le ZIP « site sport final » est remis pour relecture. Aucune opération Cloudflare à ta place, pas d'annonce « Envoyer à tous ». Base de données : seulement des ajouts, rien de supprimé. Lien du site : https://seances-sport.pages.dev/
