# Audit Playwright complet — Séances entraînement (9 au 11 octobre 2026)

Version auditée : 8.34.1 (`main`, `b331d11`), puis la branche `claude/new-session-wi9olv` jusqu’à la 8.34.2. La 8.35.0 a ensuite été vérifiée avec la même suite, complétée (10 et 11 octobre) : voir « Vérification de la 8.35.0 » (section 4) et les sections 2 et 3.
Tout a été exécuté dans le conteneur de travail, sur un serveur local qui fait tourner le vrai `worker.js` avec une base D1 simulée (`node:sqlite`) et sert `public/` comme Cloudflare. **Le site en ligne (https://seances-sport.pages.dev/) n’a pas été testé** : aucune donnée réelle n’a été touchée.

Les consignes ont été suivies : aucun test supprimé ni affaibli pour passer, aucun échec masqué, chaque modification fonctionnelle est listée (section 4 et `CHANGELOG.md`), rien n’est déclaré testé sans avoir été exécuté. Quand un test échouait à cause de l’outil de test lui-même et non du site, c’est dit explicitement (section 7).

---

## 1. Scénarios identifiés

| Fichier (`tests/audit/`) | Scénarios | Ce qui est vérifié |
|---|---:|---|
| `reprise.spec.mjs` | 41 | Reprise A01–A41 des parcours de la suite existante (création, lecteur, agenda, sauvegarde, hors ligne, admin…) |
| `pages.spec.mjs` | 3 | Chaque page (49 membres, 16 admin, adresses inexistantes) × membre/admin, interface unique depuis la 8.35 (avant : 5 scénarios, interfaces simple et avancée) : 65 étapes par combinaison ; écran d’erreur, défilement horizontal, éléments hors écran ou recouverts, contrôles sans nom, états ARIA, identifiants en double, texte cassé ; plus un auto-contrôle du vérificateur (défauts injectés) |
| `boutons.spec.mjs` | 6 | Explorateur « chaque bouton » : chaque bouton de chaque page puis de chaque fenêtre ouverte ; depuis la 8.35, signale aussi tout clic qui rend la page plus large que l’écran (nombre de clics : section 3) |
| `formulaires.spec.mjs` | 6 | Explorateur « chaque formulaire » : chaque formulaire rempli et envoyé, chaque liste ou champ « changement » modifié |
| `seances.spec.mjs` | 9 | Créer (guidée, à sa façon), modifier, dupliquer, archiver, supprimer, texte collé, recherche, données inhabituelles, séparation des comptes |
| `agenda.spec.mjs` | 5 | Rendez-vous unique et répété, exception, suppression d’une série, lien d’abonnement, agenda du téléphone (iCal) |
| `stats.spec.mjs` | 3 | Chiffres 7 / 30 / 90 jours recalculés à la main, ressenti moyen, charge |
| `profil.spec.mjs` | 3 | Mesures saisies au clavier (IMC, masse maigre, FFMI), valeurs refusées, zones à ménager respectées par le générateur |
| `api.spec.mjs` | 8 | Toutes les routes du serveur (lues dans `worker.js`) : accès anonyme, IDOR, en-têtes, secrets, suppression du compte, requêtes forgées, limite de tentatives admin |
| `compte.spec.mjs` | 6 | Inscription, connexion, déconnexion et retour arrière, changement de mot de passe, apparence suivie, signalement, aide |
| `ia.spec.mjs` | 5 | IA simulée : réponse valide, réponse piégée (HTML, actions), non-JSON, panne, objectif refusé |
| `admin.spec.mjs` | 5 | Activation (mot de passe jamais gardé), signalement piégé, e-mail masqué, « Envoyer à tous » (annuler / confirmer), rôle limité |
| `fiabilite.spec.mjs` | 9 | Fichier choisi pendant un redessin, session expirée, deux onglets, coupure réseau, 1 500 séances + 200 rendez-vous, clics rapides, retour arrière, toucher juste après la frappe (F08, 8.35), double toucher sur un bouton qui ferme une fenêtre (F09, 8.35) |
| `accessibilite.spec.mjs` | 5 | WCAG 2.1 A/AA (axe-core 4.10.3) sur chaque page (interface unique depuis la 8.35) et sur les messages temporaires affichés, clavier, focus visible, taille des cibles, texte « Grand » et « Très grand » sans page ni barre plus large que l’écran (AX05, 8.35) |
| `nouveautes.spec.mjs` | 10 | 8.35 (NV01–NV10) : phases du profil, créateur (cases « ce que je choisis », choix restés modifiables), étirements, objectifs en deux temps, sources et « Voir le passage », captures d’écran, interface unique, liens « va dans … », exercice suivant dans le lecteur |
| **Total** | **116** | par profil d’appareil (8.35 ; 113 au premier passage, 115 au second, avant AX05), plus 8 scénarios API sans navigateur ; sur les 6 profils Chromium : 704 tests (686 au premier passage, 698 au second) |

Plus les tests existants du dépôt, relancés : `npm test` (109 scripts en 8.35, 106 en 8.34.2) et `npm run test:e2e` (25 scripts navigateur).

## 2. Tests réellement exécutés

Tout a tourné dans le conteneur de travail, avec Chromium (seul navigateur installé). Commande de chaque passage complet :

```bash
PW_EXEC=/opt/pw-browsers/chromium AUDIT_WORKERS=3 node node_modules/playwright/cli.js test -c tests/audit/playwright.config.mjs \
  --project=chromium-small320 --project=chromium-small360 --project=chromium-phone390 \
  --project=chromium-android --project=chromium-tablet --project=chromium-desktop --project=api
```

3 tests en parallèle, **aucune nouvelle tentative automatique** (`retries: 0`) : un test instable reste visible.

| Exécution | Code | Quand (UTC) | Tests |
|---|---|---|---|
| Premier passage complet (8.35.0 avant les corrections de cet audit) | `1a67411` | 10 oct. 23 h 47 → 11 oct. 2 h 08 (2 h 20) | 686 = 113 scénarios × 6 profils + 8 API |
| Vérifications ciblées de chaque correction (sondes et scénarios rejoués avant / après) | branche de correction | 11 oct., pendant et après le premier passage | voir section 4 (V20 à V26) |
| Reprise (A01–A41) et fiabilité (F01–F09), 320 px et tablette, après la dernière correction | `2006174` | 11 oct. | 98 |
| `npm run check`, `npm test` (109 scripts), `npm run test:e2e` (25 scripts) | `2006174` | 11 oct. 3 h 22 → 3 h 33 | contrôle réussi ; 1 029 vérifications unitaires réussies, 0 échec ; 25 scripts de bout en bout réussis |
| Second passage complet | `2006174` | 11 oct. 3 h 34 → 5 h 48 (2 h 14) | 698 = 115 scénarios × 6 profils + 8 API |
| Sonde « taille du texte » sur toutes les pages (320 et 390 px), corrections V27 et V28, AX05 sur les 6 profils, explorateurs Profil et Paramètres à 320 px | `4c6a70d` | 11 oct. | AX05 : 6 sur 6 ; explorateurs : 2 sur 2 (1 232 clics, aucun bouton impossible à toucher) |
| `npm run check`, `npm test` : réussis ; `npm run test:e2e` : `backup-e2e` en échec (V29, défaut antérieur rendu visible), corrigé | `4c6a70d` | 11 oct. 6 h 15 → 6 h 27 | 24 scripts sur 25 |
| `npm run check`, `npm test`, `npm run test:e2e` sur le code final | `662b8cd` | 11 oct. | ⟦E2E_FINAL⟧ |
| Troisième passage complet (code final) | `662b8cd` | ⟦P3_QUAND⟧ | 704 = 116 scénarios × 6 profils + 8 API |

Explorateurs au premier passage : 14 424 clics de boutons sur les 6 profils (12 086 avec un effet visible, 1 626 boutons disparus après un redessin, 446 sans effet visible, 102 grisés, 164 « impossibles à cliquer ») et 920 essais de formulaires (868 avec effet, 44 sans effet visible, 8 « impossibles à utiliser »). Aucune erreur JavaScript, aucun écran d’erreur.

## 3. Résultats : réussis, échoués, bloqués, non exécutés

### Premier passage (`1a67411`)

| Profil | Réussis | Échoués | Bloqués | Non exécutés |
|---|---:|---:|---:|---:|
| Chromium 320 px | 105 | 8 | 0 | 0 |
| Chromium 360 px | 104 | 9 | 0 | 0 |
| Chromium 390 px | 105 | 8 | 0 | 0 |
| Chromium Pixel 7 | 106 | 7 | 0 | 0 |
| Chromium tablette 768 px | 105 | 8 | 0 | 0 |
| Chromium ordinateur 1440 px | 106 | 7 | 0 | 0 |
| API (sans navigateur) | 7 | 1 | 0 | 0 |
| **Total** | **638** | **48** | **0** | **0** |
| Firefox, WebKit (iPhone) | — | — | — | 2 × 113 : navigateurs absents (section 9) |

Les 48 échecs, un par un, ont une cause établie :

| Cause | Échecs | Où | Nature |
|---|---:|---|---|
| ST01, ST02, ST03 : chiffres détaillés de Progrès introuvables | 18 | 6 profils | **défaut du site V20** (scénarios adaptés au nouveau chemin « 📊 Voir tous mes chiffres ») |
| S01 : l’étape « cpQuickGo » n’existe plus (la séance est proposée directement) | 6 | 6 profils | scénario à jour avec le parcours actuel |
| Chaque bouton — Bibliothèque | 6 | 6 profils | **V22** à 320, 360 et 390 px (page élargie après « Copier dans mes exercices ») ; sur tous les profils, un bouton « ↑ » grisé compté à tort (outil) |
| Chaque bouton — Profil | 6 | 6 profils | outil : carte des douleurs touchée entre deux formes, « Synchronisation… » disparu avant le clic |
| Chaque bouton — Paramètres | 6 | 6 profils | outil : visite guidée en train de démarrer jamais refermée (analyse qui a fait trouver **V21**), « N modification(s) en attente » disparu avant le clic |
| Chaque bouton — Administration | 2 | 320, 360 px | **V25** (barre « Modifier les textes » sur le bouton « Fermer ») ; outil : mode textes laissé actif |
| AX01 sur l’accueil | 1 | 390 px | outil : message mesuré pendant son fondu ; le contrôle du message affiché a révélé **V23** |
| S09 | 1 | 360 px | **V24** (toucher perdu pendant la mise à jour de l’aperçu) |
| A04 | 1 | tablette | **V26** (double toucher qui actionne le bouton dessous) |
| API02 | 1 | API | attente à mettre à jour : route publique voulue de la 8.35, relue (section 4) |

À noter aussi, sans échec de test : l’explorateur des formulaires n’a pas pu envoyer « Signaler un bug » sur les 6 profils, juste après l’essai de la fenêtre d’import Strava. La cause exacte n’est pas isolée ; dans un état propre (sonde) et avec l’outil corrigé, le formulaire est envoyé.

### Second passage (`2006174`)

| Profil | Réussis | Échoués | Bloqués | Non exécutés |
|---|---:|---:|---:|---:|
| Chromium 320 px | 113 | 2 | 0 | 0 |
| Chromium 360 px | 114 | 1 | 0 | 0 |
| Chromium 390 px | 114 | 1 | 0 | 0 |
| Chromium Pixel 7 | 114 | 1 | 0 | 0 |
| Chromium tablette 768 px | 114 | 1 | 0 | 0 |
| Chromium ordinateur 1440 px | 114 | 1 | 0 | 0 |
| API (sans navigateur) | 8 | 0 | 0 | 0 |
| **Total** | **691** | **7** | **0** | **0** |

41 des 48 tests en échec au premier passage réussissent (ST01–ST03, S01, S09, A04, AX01, API02, explorateurs Bibliothèque et Administration, Paramètres sauf à 320 px). Les 7 qui échouent encore sont tous dans l’explorateur des boutons, pour d’autres raisons qu’au premier passage :

| Cause | Échecs | Où | Nature |
|---|---:|---|---|
| Chaque bouton — Profil : carte des douleurs « impossible à toucher » (9 ou 10 zones) | 6 | 6 profils | outil : la zone de toucher était visée seule, le rond posé dessus la « recouvrait » ; corrigé dans l’outil |
| Chaque bouton — Paramètres : page de 339 px après une visite guidée | 1 | 320 px | **défaut du site V27** (texte « Très grand » choisi juste avant par l’explorateur) ; a fait trouver **V28** |

Explorateurs au second passage : 14 393 clics (12 146 avec effet, 54 « impossibles à cliquer », tous sur la carte des douleurs, 7 « page plus large que l’écran ») et 920 essais de formulaires, dont « Signaler un bug » envoyé sur les 6 profils. Aucune erreur JavaScript, aucun écran d’erreur.

### Troisième passage (code final `662b8cd`)

⟦RESULTATS_P3⟧

## 4. Défauts trouvés, par gravité

Gravité : **critique** = perte ou fuite de données, faille de sécurité, fonction principale inutilisable ; **majeur** = résultat faux ou perte silencieuse dans un usage courant, ou blocage pour une catégorie d’utilisateurs ; **mineur** = gêne, affichage, cas rare. Tous les défauts ci-dessous ont été **corrigés** sur la branche, avec un test qui échouait avant et passe après, sauf mention contraire.

### Critiques

Aucun trouvé. En particulier, aucune fuite entre comptes (IDOR), aucun secret dans `public/`, aucune route d’administration accessible sans le rôle, mot de passe administrateur jamais gardé ni renvoyé, signalements et réponses d’IA piégés affichés comme du texte (scénarios API01, API02, API03, API05, API06, AD01, AD02, IA02).

### Majeurs (4)

| N° | Défaut | Reproduire | Attendu | Observé | Preuve |
|---|---|---|---|---|---|
| M1 (N02) | Un fichier choisi pendant que la page se redessine est perdu, sans message | Paramètres › Données › « Importer une sauvegarde » ; la fenêtre de choix du fichier est ouverte ; pendant ce temps la page se redessine (synchronisation au retour au premier plan) ; choisir le fichier | « Importer cette sauvegarde ? » | Rien ne se passe | F01 (échouait avant, passe après) ; cause : l’écoute « change » passait par le document et l’ancien champ, sorti de la page, ne lui parvenait plus |
| M2 | Un ressenti non donné est enregistré « 1 » par le serveur | Terminer une séance sans donner le ressenti ; lire l’historique renvoyé par `/api/history` | ressenti 0 (non donné) | ressenti 1 : la moyenne du ressenti et la charge (minutes × ressenti) sont faussées | `audit-fixes-2.test.mjs`, ST02, ST03 ; cause : `clamp(d.rpe, 1, 5)` dans `cleanHistoryData` |
| M3 | La virgule décimale est effacée sans prévenir | Profil › Corps : taper « 72,5 » au clavier dans le poids (ou « 32,5 » dans un tour de bras) ; enregistrer | 72,5 kg | 725 kg (et 325 cm) ; l’IMC et la composition corporelle deviennent absurdes | P01 ; cause : Chromium efface la virgule dans un champ numérique |
| M4 | Clavier : le focus n’entre pas dans une fenêtre ouverte et se perd à sa fermeture | Au clavier, ouvrir ☰ Menu ; appuyer sur Tab ; puis Échap | Le focus entre dans la fenêtre, puis revient sur ☰ (WCAG 2.4.3) | Le focus reste derrière la fenêtre ; après Échap il repart en haut de la page | AX02 |

### Mineurs (12)

| N° | Défaut | Reproduire | Attendu → Observé | Preuve |
|---|---|---|---|---|
| m1 (N01) | Un ancien lien de rappel ouvre l’accueil | Ouvrir `#/home/agenda` (adresse des notifications reçues avant la 8.34.1) | Calendrier → Accueil | A13 (`reprise.spec.mjs`) |
| m2 | En-têtes de sécurité absents de certaines réponses | `GET /api/version`, `/api/changes`, `/api/global`, icônes, flux iCal | `X-Content-Type-Options`, `Content-Security-Policy`… → absents | API04, `audit-fixes-2.test.mjs` |
| m3 | Supprimer un rendez-vous répété laisse ses exceptions en base | Créer un rendez-vous répété, en déplacer une occurrence, supprimer la série | Plus rien sur le serveur → exceptions orphelines gardées (invisibles) | C02 |
| m4 | Un rendez-vous unique déplacé est exporté avec une exclusion sans règle de répétition | Déplacer un rendez-vous unique, s’abonner au flux iCal | Une seule entrée → l’ancienne entrée (avec EXDATE sans RRULE) et la nouvelle ; certains agendas montrent les deux | C05, `audit-fixes-2.test.mjs` |
| m5 | Ressenti moyen écrit avec un point | Progrès › Résumé | « 3,4 » → « 3.4 » | ST02 |
| m6 | Badges non obtenus peu lisibles | Progrès › Badges | Contraste ≥ 4,5:1 → 2,88:1 | AX01 (axe) |
| m7 | Jours de la semaine sans nom lu par les lecteurs d’écran | Accueil › série de la semaine | Nom annoncé → `aria-label` sans rôle, ignoré | AX01 |
| m8 | Bouton « ⓘ » d’un exercice trop petit | Page d’une séance | ≥ 24 × 24 px → 23 px | AX04 |
| m9 | Un message en efface un autre aussitôt | Enregistrer quelque chose au moment où un badge est gagné | « Enregistré » lisible → remplacé au bout de quelques millisecondes | Explorateur des boutons ; corrigé : 1,8 s minimum, erreurs immédiates |
| m10 | « Lancer la visite » d’une mise à jour provoque une erreur JavaScript | Paramètres › Mises à jour › « 🧭 Lancer la visite » | Aucune erreur → `TypeError: Cannot read properties of null (reading 'style')` (8 fois) | Explorateur des boutons ; la bulle était placée avant d’être dessinée |
| m11 | Un nouveau compte voit 4 anciennes versions comme « nouvelles », et la liste des mises à jour est dans le désordre | Créer un compte ; regarder 🔔 | 1 (la dernière version) → 4 (8.23 à 8.26, datées après la 8.27 dans `news.js`) | Mesure dans le navigateur avant / après ; captures `docs/assets/audit-playwright/` |
| m12 | L’icône du calendrier affiche « 17 juillet », en anglais | Barre du haut | Icône neutre → émoji 📅 « July 17 » | Captures avant / après |

### Petites gênes corrigées (demande « trucs chiants ou pas pratiques »)

| Gêne | Avant | Après |
|---|---|---|
| Menu sur la page courante | Toucher la page où l’on est déjà dans ☰ Menu ne faisait rien, le menu restait ouvert | Le menu se ferme |
| « − » à la valeur minimale | Actif mais sans effet (mode compétition à 0, essais à 1) | Grisé |
| Deux « Express » sur l’accueil | « Express 10 minutes » (séance courte) et le raccourci « Express » (décrire son envie) | Raccourcis « 💬 Décrire mon envie » et « 🧭 Sport et durée » |
| « ▶ » d’une suggestion | Ressemblait à « lancer », ouvrait le créateur | « Préparer › » |
| Lancer une séance générée | « ▶ Lancer » tout en bas (≈ 2 000 px de défilement sur un téléphone) | « ▶ Lancer maintenant » aussi en haut |
| Nom de la séance | Invisible en haut de sa page (seulement dans le champ de modification) | Affiché en titre |
| Remplacer un exercice | « Choisir » grisé si le matériel manque, sans recours (12 cas sur la séance d’essai) | « Choisir quand même », l’avertissement reste |
| Phrase de régularité | « (6 semaines) (très régulière) » | « (6 semaines) : pratique très régulière » |

### Défaut introduit pendant l’audit, puis corrigé

- Le premier correctif du clavier (M4) gardait le code avec `typeof document !== 'undefined'` : les tests unitaires qui simulent un `document` incomplet plantaient, et **`npm test` s’arrêtait à `player.test.mjs`** (les scripts suivants n’étaient pas exécutés). Ce défaut était poussé sur la branche (commit `9b74552`), jamais déployé. Corrigé dans `a3d6cc7` ; `npm test` refait en entier : 106 scripts, sortie 0.

### Vérification de la 8.35.0 (10 et 11 octobre) : défauts trouvés et corrigés

La 8.35.0 (demandes : phases, étirements, sources, captures, objectifs, interface unique…) a été vérifiée par les 25 scripts de bout en bout, les tests unitaires et 10 nouveaux scénarios d’audit (`tests/audit/nouveautes.spec.mjs`, NV01 à NV10). Le retrait de l’interface avancée, demandé, a caché des éléments qui n’existaient que dans l’ancien accueil « avancé » : les tests de bout en bout, écrits pour l’interface avancée, l’ont révélé. Chaque défaut est corrigé dans le site ; le test qui l’a montré passe après la correction.

| N° | Gravité | Défaut | Reproduire | Attendu → Observé | Preuve |
|---|---|---|---|---|---|
| V01 | majeur | « Mes phases » absent de l’accueil du Profil | Profil (accueil de l’onglet) | « 🧩 Mes phases » → absent (seulement par un lien indirect du créateur) | NV01, `e2e.mjs` |
| V02 | majeur | Programme en cours absent de l’accueil | Planning › Créer un programme (séance aujourd’hui) ; enregistrer | La carte du programme et « ▶ C’est parti » sur l’accueil → rien (seulement dans le calendrier) | `e2e.mjs` (programme) |
| V03 | majeur | Un choix fait à la main dans une phase restait grisé | Créer une séance › Ta structure › une phase › changer le sport (ou le lieu, ou ses objectifs) | Toujours modifiable → liste grisée, impossible de revenir sur son choix | NV10, `objectives-phases-e2e` |
| V04 | majeur | « ＋ » sur une de ses phases refusé sur une séance courte | Séance de 30 min proposée ; « ✏️ Modifier encore » ; ＋ sur sa phase « Spray wall » | Phase ajoutée → « Ce moment ne tient pas… Déverrouille ou allonge un bloc » (les verrous n’existent plus) | NV01, `routines.test.mjs` |
| V05 | mineur | « Ajouter un échauffement » impossible quand toutes les durées sont réglées par la personne | Régler soi-même chaque durée ; Améliorations › Appliquer | Appliqué (séance allongée, dit sur la carte) → « Suggestion impossible à appliquer » | `e2e.mjs` (V1), `phaseplan.test.mjs` |
| V06 | mineur | « 🔎 Analyser avec l’assistant » ouvrait un message vide | Administration › Signalements › capture › Analyser (assistant pas encore ouvert dans la session) | Demande préparée → champ vide | NV06 |
| V07 | mineur | « Qui reçoit ta demande ? » restait faux | Ouvrir le coach, déplier « Qui reçoit ta demande ? » | « transmis à Google » (ou Cloudflare) → « pas encore connu » | `assistant-ui-e2e` |
| V08 | mineur | Un nom de séance avec un long mot sans espace élargissait la page | Nom « <img src=x onerror=…> » à 390 px | Page de 390 px → 478 px (titre dans une rangée flexible) | A29, S06 (échouaient avant, passent après) |
| V09 | mineur | Un compte tout neuf voyait « N mises à jour depuis ta dernière visite » | Créer un compte, recharger la page | Rien → bandeau et visite de rattrapage de toutes les versions | « toutes les pages — admin » (boutons recouverts par le bandeau) |
| V10 | mineur | Deux messages coup sur coup : le premier pouvait être perdu | Importer deux fois le même CSV rapidement | « … déjà présent(s) (pas de doublon) » → jamais affiché | `e2e.mjs` (import CSV) |
| V11 | mineur | « Plus de détails sur ma séance » se refermait à chaque choix | Fin de séance › Plus de détails › toucher un muscle | Reste ouvert → refermé | `e2e.mjs` (questionnaire) |
| V12 | mineur | Carte « ✓ Séance enregistrée » (ce qui change pour la suite) absente | Terminer et enregistrer une séance | Carte sur l’accueil → absente | `e2e.mjs` |
| V13 | mineur | « Petite question » du profil absente de l’accueil | Profil incomplet, ouvrir l’accueil | Question en un toucher → absente | `e2e.mjs` |
| V14 | mineur | Chrono sans raccourci sur l’accueil | Accueil | « ⏱ Chrono » → seulement dans ☰ Menu | `e2e.mjs` (chrono) |
| V15 | mineur | « ✍️ Avec tes mots » absent du créateur | Créer une séance sans cocher « Mes objectifs » | Champ à l’étape 1 → nulle part | `goal-profile-e2e` |
| V16 | mineur | Bouton « ＋ Préparer des étirements pour cette séance » plus large que l’écran | Page d’une séance à 320 px | Passe à la ligne → barre de défilement horizontale | `free-session-e2e` |
| V17 | mineur | Liens « va dans … » trop petits pour un doigt | Progrès › Résumé | ≥ 24 px de haut → 20 px | AX04 |
| V18 | gêne | Rubrique vide « 8 · Ce que l’app décide » et messages « verrouillé » | Panneau d’une phase | Plus de verrous → rubrique vide, messages sur des réglages « verrouillés » | `v2chain.test.mjs`, `e2e.mjs` |
| V19 | durcissement | Lien « Voir le passage » affiché sans vérifier son protocole | (le serveur est seul à le fournir) | Seuls https et http → aucun contrôle côté page | NV05 |
| V20 | majeur | Chiffres détaillés de Progrès inaccessibles | Progrès › Résumé, avec des séances faites | Séances, minutes et séries sur 7, 30 et 90 jours, charge de chaque semaine → seulement le résumé simple, aucun chemin vers ces chiffres (ils n’existaient que dans l’interface avancée retirée) | ST01, ST02, ST03 (échouaient au premier passage : `.kpis` jamais affiché) ; « 📊 Voir tous mes chiffres » ajouté |
| V21 | mineur | Le démarrage d’une visite guidée bloquait les touchers | Paramètres › Mises à jour › « 🧭 Lancer la visite », puis toucher aussitôt un autre bouton | Le toucher passe → calque plein écran encore vide (jusqu’à 1,5 s, le temps de trouver l’élément à montrer) qui intercepte tout | Analyse des échecs de l’explorateur (Paramètres) |
| V22 | majeur | Après « Copier dans mes exercices », toute l’app devient plus large que l’écran | Bibliothèque › Exercices › un exercice › « Copier dans mes exercices », à 320, 360 ou 390 px | Largeur de l’écran → 405 px pour un écran de 320 : barre d’onglets, fenêtres et messages élargis et coupés à droite, touchers qui tombent à côté (cause : « 💡 Proposer à tout le monde » sur une seule ligne dans la ligne de l’exercice copié) | Explorateur des boutons (Bibliothèque : dizaines de boutons « impossibles à cliquer » à 320 et 360 px) ; trace Playwright (la zone d’affichage passe à 405 × 810 au clic sur « Copier dans mes exercices ») ; sonde : 405 px avant, 320 px après correction (aussi vérifié à 390 et 768 px) |
| V23 | mineur | Messages d’erreur peu lisibles | Toute erreur affichée en bas de l’écran (environ 125 messages dans le code) | Contraste ≥ 4,5:1 → 3,56:1 (3,86:1 en mode daltonien) | axe sur le message affiché : échoue avec l’ancienne couleur, passe avec la nouvelle (6:1 ; 6,2:1 en mode daltonien) ; nouvelle étape d’AX01 |
| V24 | mineur | Un toucher sur « Ajouter à ma séance » juste après la frappe était perdu | Une séance › ✍️ Écrire des exercices › écrire « 3 × 10 squats » › toucher « Ajouter à ma séance » dans les 0,2 s | Exercice ajouté → rien : fenêtre toujours ouverte, 0 exercice (l’aperçu s’allonge pendant l’appui, le bouton descend de 31 px) | S09 à 360 px (échec instable au premier passage) ; sonde reproductible (appui à 0 et 150 ms : perdu ; après correction : ajouté) ; F08 |
| V25 | mineur | Mode « Modifier les textes » (administrateurs) : la barre recouvrait « Fermer » | Activer le mode textes, ouvrir une grande fenêtre à 320 px, toucher « Fermer » | Fenêtre fermée → le toucher tombe sur « Terminer » de la barre (le mode textes s’arrête, la fenêtre reste) | Explorateur des boutons (Administration, 320 et 360 px) ; sonde : élément touché au centre de « Fermer » = « Terminer » avant, « Fermer » après |
| V26 | mineur | Un double toucher sur un bouton qui ferme une fenêtre déclenchait aussi le bouton situé dessous | Une séance › ✍️ Écrire des exercices › écrire › toucher deux fois vite « Ajouter à ma séance » | Exercice ajouté une fois, on reste sur la séance → ajouté une fois, mais à 768 px la page Étirements s’ouvre (« ＋ Préparer des étirements pour cette séance » était dessous) ; à 320 px, retour à l’accueil de la Bibliothèque | A04 sur tablette (échec 3 fois sur 3 avant, réussi après) ; F09 (échoue à 320 px sans la correction). Le navigateur compte les touchers : seul le second toucher d’un double toucher (compté 2), au même endroit et juste après la fermeture, est ignoré ; un nouveau toucher passe |
| V27 | mineur | Texte « Grand » ou « Très grand » : pages plus larges que l’écran à 320 px | Paramètres › Affichage › Taille du texte « Grand » (ou « Très grand »), écran de 320 px ; ouvrir l’accueil, Bibliothèque › Mes séances, Bibliothèque commune, Paramètres › Mises à jour | Page de la largeur de l’écran → 343 px (« Grand ») et 375 px (« Très grand ») sur l’accueil ; 332 et 365 px sur Mes séances ; 351 px (Bibliothèque commune) et 339 px (Mises à jour) en « Très grand ». Cause : petits boutons au libellé long qui ne passent jamais à la ligne (« ⚡ Je n’ai rien prévu : 3 questions », « ☑ Sélectionner plusieurs séances », « ＋ Partager une de mes séances », « 🧭 Lancer la visite (6 étapes) ») ; rien à 360 px et plus | Explorateur des boutons (second passage : « page de 339 px » après une visite guidée, le texte venant d’être mis en « Très grand ») ; sonde sur toutes les pages en « Normal », « Grand », « Très grand » ; nouveau scénario AX05 (échoue avant, réussit après sur les 6 profils) |
| V28 | mineur | Texte « Grand » ou « Très grand » : l’onglet « Paramètres » coupé dans la barre du bas | Même réglage, écran de 320 px, n’importe quelle page | Les 5 onglets entiers → « Param… » coupé par le bord de l’écran (les mots des onglets ne se coupent pas) | Capture en « Très grand » ; AX05 (contrôle des barres fixes ajouté : échoue avant sur toutes les pages, réussit après) |
| V29 | mineur | Copie locale non enregistrée après une synchronisation si l’app se ferme aussitôt | Importer une sauvegarde (ou faire une séance), laisser la synchronisation finir, recharger ou fermer l’app dans le quart de seconde | Rouverte, l’app montre tout → la copie gardée sur l’appareil n’avait pas les dernières données synchronisées (historique 0 au lieu de 1) ; elles revenaient à la synchronisation suivante (jamais perdues : le serveur les a), plus tard encore hors ligne. Cause : copie écrite 0,25 s après la synchronisation, écriture interrompue par la fermeture | `backup-e2e` instable, sans rapport avec les corrections du jour : échecs 3 fois sur 6 sur `a5e7f90`, 4 sur 6 sur `2006174`, 3 sur 5 sur `4c6a70d` ; mesure dans la page : copie locale à 0 au rechargement. Après correction (copie écrite avant d’annoncer la synchronisation finie) : 8 réussites sur 8, test inchangé |

Défauts de l’outil de test (corrigés dans l’outil, jamais dans le site) :
- **Contrôle de débordement aveugle en émulation mobile.** Chromium élargit la fenêtre à la taille du contenu (`innerWidth` = 478 pour un écran de 390) : « largeur de la page ≤ largeur de la fenêtre » restait vrai même quand la page débordait. Les contrôles comparent maintenant à la vraie largeur de l’écran. Conséquence : **les contrôles de débordement des profils mobiles de l’audit 8.34.2 étaient moins sûrs qu’annoncé** ; V08 en est la preuve.
- **Explorateur des boutons cassé depuis le commit `a3d6cc7`** (mise en commun de l’explorateur) : une variable n’était plus transmise et chaque test « chaque bouton » échouait à la fin, après tous ses clics. Les chiffres « 2 583 clics » de la section 1 viennent d’exécutions antérieures à ce commit. Corrigé ; voir la section 3 pour le passage final.
- **Explorateur : emplacement perdu dans les messages d’échec.** La position du bouton écrasait le champ « page / fenêtre de … », d’où « [object Object] » dans les messages du premier passage. Corrigé (champ « position »).
- **Explorateur : états laissés entre deux clics.** Une visite guidée en train de démarrer (pas encore de bouton « Terminer ») et le mode « Modifier les textes » restaient actifs et recouvraient les boutons suivants ; un bouton grisé était compté « impossible à cliquer » ; un groupe SVG en deux morceaux (carte des douleurs) était touché en son centre, entre les deux ; un élément disparu avant le clic (« 1 modification(s) en attente » à la fin d’une synchronisation) était compté « impossible à cliquer ». Corrigé dans l’outil. L’analyse de ces cas a aussi fait trouver V21 et V25 dans le site.
- **Explorateur : aucun contrôle de la largeur de la page après un clic.** Les contrôles de mise en page ne regardent que l’état initial des pages ; V22 n’apparaît qu’après une action. L’explorateur signale désormais tout clic qui rend la page plus large que l’écran.
- **AX01 : message temporaire contrôlé pendant son apparition.** axe a mesuré un message en plein fondu (opacité entre 0 et 1, couleurs mêlées au fond) : « contraste 1,18:1 » sur l’accueil à 390 px. Le test attend maintenant la fin du fondu ; les messages affichés sont contrôlés à part, ce qui a révélé V23.
- **S01, ST01 à ST03 écrits pour un parcours retiré** (étape « cpQuickGo », chiffres de l’interface avancée) : adaptés au parcours actuel ; ST01 à ST03 ont ainsi révélé V20.
- **Explorateur : carte des douleurs, second essai.** La première correction touchait la forme seule (la zone de toucher invisible) ; le rond visible, posé dessus mais dans le même bouton, la « recouvrait » pour Playwright, d’où 9 ou 10 boutons « impossibles à cliquer » par profil au second passage. Le groupe est maintenant touché lui-même, au centre de sa première zone. Pour une personne, le toucher arrive au bouton (le rond fait partie du bouton).
- **Explorateur : réglages laissés d’un clic à l’autre.** Les tailles de texte sont essayées dans l’ordre (« Petit », « Normal », « Grand », « Très grand ») : la suite du groupe Paramètres se déroule en « Très grand ». C’est ce qui a fait voir V27 ; le scénario AX05 vérifie maintenant ces tailles exprès, sur toutes les pages.
- **API02 : attente à mettre à jour, pas un défaut du site.** Le test relit toutes les routes de `worker.js` et exige 401 sans compte, sauf pour une liste de routes publiques voulues. La 8.35 a ajouté `GET /api/sources/passages` (« Voir le passage »), publique comme les sources que voient aussi les invités. Relue avant d’être ajoutée à la liste : identifiants limités à la liste des sources (8 au plus), 120 demandes par heure et par adresse, réponses gardées 30 jours, aucune donnée de compte, le serveur n’appelle que PubMed. Un contrôle a été ajouté : un identifiant inventé (chemin, adresse, balise) est ignoré.

## 5. Étapes exactes de reproduction

Elles sont dans les tableaux de la section 4. Chaque défaut a aussi son test automatique ; ces tests ont été vus en échec sur le code d’avant la correction, au moment où ils ont été écrits. Pour les rejouer sur la 8.34.1 (commande indicative, non rejouée après coup) :

```bash
git checkout b331d11 -- public worker.js         # version 8.34.1
PW_EXEC=/opt/pw-browsers/chromium AUDIT_OUT=/tmp/audit npm run test:audit -- --project=chromium-phone390 -g "F01|P01|ST02|AX02|C05"
git checkout claude/new-session-wi9olv -- public worker.js
```

## 6. Attendu et observé

Voir la section 4 : chaque ligne donne le résultat attendu et le résultat observé avant correction.

## 7. Captures, traces et erreurs

- Rapports Playwright (HTML et JSON), traces des échecs, captures des boutons non cliquables, journaux du navigateur (erreurs JavaScript, requêtes en échec) : archive de preuves remise à part (`preuves-audit-playwright.zip`).
- Captures avant / après dans `docs/assets/audit-playwright/` : accueil d’un nouveau compte (icône « 17 juillet », 4 notifications) et suggestion « ▶ » qui ouvrait le créateur.
- Erreurs relevées par l’explorateur des boutons avant correction : 8 × `TypeError: Cannot read properties of null (reading 'style')` (m10). Après correction : ⟦ERREURS_APRES⟧.
- Échecs dus à l’outil de test, et non au site (corrigés dans l’outil, jamais dans le site) :
  - A41 : Chromium lancé en locale « C » ignorait les chemins de fichiers accentués → la configuration force UTF-8.
  - Vérificateur des pages : texte des replis fermés compté comme visible → replis exclus.
  - Explorateur : mauvais préfixe de zone, fenêtres (visite, lecteur, chrono, séance à plusieurs) pas refermées entre deux clics, fond de fenêtre compté comme bouton, cases à cocher non vues comme un effet.
  - C01 : le serveur garde volontairement le rendez-vous et son exception ; vérifié par l’affichage.
  - C04, S06, API01, P01, F02, IA04, AX01, AD : attente trop courte, recherche de texte trop large, route qui désactivait l’administrateur pendant le test, `fill` refusé par un champ numérique (ce qui a révélé M3), jeton révoqué volontairement à la reconnexion, question lue comme une commande, politique de sécurité qui bloquait l’injection d’axe, rechargement manquant.
  - Explorateur des formulaires : un formulaire réussi se vide, ses champs obligatoires paraissaient invalides → validité contrôlée avant l’envoi.

## 8. Fonctions insuffisamment couvertes

Couverture mesurée par `node tests/audit/couverture.mjs` (actions réellement déclenchées dans le navigateur pendant l’audit, d’après les traces de chaque test) :

⟦COUVERTURE⟧

Restent peu ou pas couverts par l’audit navigateur (certains le sont par les tests unitaires ou E2E existants) :
- les champs « changement » du créateur de séance (curseurs, phases, déplacements, verrous) : couverts surtout par `npm test` et `test:e2e`, peu par l’audit ;
- photos (progrès, voies, projets), imports de fichiers CSV / GPX / Strava : un choix de fichier demande une personne ;
- notifications push réelles, installation de l’application (PWA), partage natif, micro et voix ;
- séance à plusieurs sur deux vrais appareils ;
- Studio d’administration en profondeur (brouillons, publication, retour arrière) : seulement ouvert et parcouru.

## 9. Limites de l’audit

- **Navigateurs** : seul Chromium est installé. Firefox et WebKit (Safari, iPhone) n’ont **pas** été exécutés : `browserType.launch: Executable doesn't exist at /opt/pw-browsers/firefox-1543/firefox/firefox` et `…/webkit-2359/pw_run.sh` ; leur installation est interdite ici. Les profils sont déclarés dans la configuration pour être relancés ailleurs (`--project=firefox-desktop`, `--project=webkit-iphone`).
- **Appareils** : écrans simulés (320, 360, 390 px, Pixel 7, tablette 768 px, ordinateur 1440 px), pas de vrais téléphones.
- **Serveur** : Worker local et base SQLite, pas Cloudflare ni la vraie D1 ; aucun test sur le site en ligne.
- **IA** : Workers AI et Gemini simulés (réponses fabriquées par le test) ; la qualité réelle des réponses n’est pas évaluée.
- **Accessibilité** : axe-core et contrôles automatiques ; aucun vrai lecteur d’écran (VoiceOver, TalkBack), aucun jugement humain sur la clarté.
- **Explorateurs** : un clic par bouton et un niveau de fenêtre ; les confirmations sont toujours refusées pour ne rien détruire, donc les suppressions confirmées sont vérifiées par les scénarios dédiés, pas par l’explorateur. Un bouton « sans effet visible » peut avoir un effet que la signature ne voit pas (son, vibration…).
- **Explorateurs, suite (8.35)** : entre deux clics, l’explorateur referme la visite guidée et sort du mode « Modifier les textes » ; un bouton n’est donc pas essayé pendant une visite ou en mode textes (V21 et V25 ont été trouvés en analysant ces cas, pas par l’explorateur lui-même). Le contrôle « page plus large que l’écran » ne signale que le premier clic qui la provoque ; tant qu’elle reste trop large, les clics suivants peuvent tomber à côté.
- **Sources** : le réseau de cet environnement bloque PubMed et les éditeurs ; « Voir le passage » est vérifié avec une réponse simulée du serveur (NV05) et des tests unitaires, jamais sur le vrai site PubMed.
- **Instabilité** : chaque test n’est lancé qu’une fois par passage (aucune nouvelle tentative automatique). Un échec isolé est analysé (V24 venait d’un échec à 360 px seulement) ; un test qui passe une fois peut encore échouer dans de rares conditions de temps.
- **Performance** : mesurée sur la machine de test (F05), pas sur un téléphone lent ni sur un vrai réseau.

## 10. Conclusion : prêt pour la production ?

⟦CONCLUSION⟧
