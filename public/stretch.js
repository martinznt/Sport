// stretch.js — étirements (8.35) : un catalogue d'étirements doux par zone, et une séance d'étirement construite pour
// une séance donnée (zones qu'elle a fait travailler, matériel du lieu, place au sol, durée voulue). Pur JavaScript, sans
// DOM. Conseils généraux de récupération : jamais un avis médical (une douleur = on arrête et on consulte si elle dure).
import { normalizeEx, uid } from './shared.js';

/** Zones proposées à la personne, et les muscles de l'app (model.js › MUSCLES) qu'elles regroupent. */
export const ZONES = {
  avantbras: ['🖐️', 'Avant-bras et doigts', ['avant_bras_flech', 'avant_bras_ext']],
  epaules: ['🤷', 'Épaules', ['deltoide_ant', 'deltoide_lat', 'deltoide_post', 'coiffe']],
  pectoraux: ['🫁', 'Pectoraux', ['pectoraux']],
  dos: ['🔙', 'Dos (dorsaux, haut du dos)', ['grand_dorsal', 'rhomboides', 'trapezes', 'grand_dentele']],
  bras: ['💪', 'Bras (biceps, triceps)', ['biceps', 'triceps']],
  cou: ['🧣', 'Cou et trapèzes', ['trapezes']],
  lombaires: ['🧍', 'Bas du dos', ['lombaires']],
  abdos: ['🔆', 'Abdos et flancs', ['grand_droit', 'obliques']],
  hanches: ['🦋', 'Hanches (avant, adducteurs)', ['flechisseurs_hanche', 'adducteurs', 'moyen_fessier']],
  fessiers: ['🍑', 'Fessiers', ['grand_fessier', 'moyen_fessier']],
  ischios: ['🦵', 'Arrière des cuisses (ischio-jambiers)', ['ischios']],
  quadriceps: ['🦿', 'Avant des cuisses (quadriceps)', ['quadriceps']],
  mollets: ['🦶', 'Mollets et chevilles', ['mollets', 'tibial']],
};
/** Matériel utile pour s'étirer (ids de model.js › EQUIPMENT). Un mur ou un montant de porte est supposé partout. */
export const STRETCH_GEAR = ['band', 'bar', 'mat', 'pole', 'bench'];

// [id, nom, emoji, zones, secondes, deux côtés, position (debout | assis | sol), matériel, consignes]
const S = (id, name, emoji, zones, secs, perSide, pos, needs, cues) => ({ id, name, emoji, zones, secs, perSide, pos, needs, cues });
export const STRETCHES = [
  S('st-flex', 'Fléchisseurs des doigts, paume vers l’avant', '🙏', ['avantbras'], 30, true, 'debout', [], ['Bras tendu devant toi, paume vers l’avant, doigts vers le bas.', 'Avec l’autre main, tire doucement les doigts vers toi.', 'Tu dois sentir un étirement doux dans l’avant-bras, jamais une douleur.']),
  S('st-ext', 'Extenseurs, dos de la main', '🤚', ['avantbras'], 30, true, 'debout', [], ['Bras tendu, poing doucement fermé, dos de la main vers l’avant.', 'Plie le poignet vers le bas et appuie légèrement avec l’autre main.']),
  S('st-priere', 'Prière inversée des poignets', '🙌', ['avantbras'], 30, false, 'debout', [], ['Paumes l’une contre l’autre devant la poitrine, coudes écartés.', 'Descends lentement les mains sans les séparer, jusqu’à sentir les avant-bras.']),
  S('st-poignets', 'Cercles des poignets', '🔄', ['avantbras'], 30, false, 'debout', [], ['Doigts croisés, fais de grands cercles lents avec les poignets.', 'Change de sens à mi-temps.']),
  S('st-suspension', 'Suspension passive', '🪢', ['dos', 'epaules'], 20, false, 'debout', ['bar'], ['Pieds au sol ou sur une marche si besoin, bras tendus, épaules relâchées.', 'Laisse le poids du corps étirer le dos, respire.', 'Doigts fatigués après ta séance ? Passe cet étirement.']),
  S('st-porte', 'Pectoraux contre un montant de porte', '🚪', ['pectoraux', 'epaules'], 30, true, 'debout', [], ['Avant-bras contre un montant, coude à hauteur d’épaule.', 'Avance doucement le buste et tourne-le à l’opposé.']),
  S('st-croise', 'Épaule, bras croisé', '🤗', ['epaules'], 30, true, 'debout', [], ['Passe le bras tendu devant la poitrine.', 'Avec l’autre bras, rapproche-le doucement, épaule basse.']),
  S('st-triceps', 'Triceps derrière la tête', '🙆', ['bras', 'epaules'], 30, true, 'debout', [], ['Coude plié au-dessus de la tête, main entre les omoplates.', 'L’autre main pousse doucement le coude vers l’arrière.']),
  S('st-biceps', 'Biceps contre un mur', '🧱', ['bras', 'pectoraux'], 30, true, 'debout', [], ['Main à plat sur un mur derrière toi, bras tendu à hauteur d’épaule.', 'Tourne doucement le corps à l’opposé du mur.']),
  S('st-enfant', 'Posture de l’enfant, bras loin devant', '🧎', ['dos', 'lombaires', 'epaules'], 45, false, 'sol', [], ['À genoux, fesses vers les talons, bras tendus loin devant.', 'Pousse doucement les mains vers l’avant, respire dans le dos.']),
  S('st-lateral', 'Inclinaison latérale debout', '🌙', ['dos', 'abdos'], 30, true, 'debout', [], ['Pieds écartés, un bras au-dessus de la tête.', 'Penche-toi doucement du côté opposé, sans tourner le buste.']),
  S('st-chat', 'Dos rond, dos creux', '🐈', ['lombaires', 'dos'], 45, false, 'sol', [], ['À quatre pattes, arrondis le dos en expirant, puis creuse-le en inspirant.', 'Lentement, sans forcer en bout de mouvement.']),
  S('st-torsion', 'Torsion allongée', '🌀', ['lombaires', 'abdos', 'fessiers'], 30, true, 'sol', [], ['Allongé sur le dos, un genou plié bascule de l’autre côté.', 'Épaules au sol, regard à l’opposé du genou.']),
  S('st-cobra', 'Cobra doux', '🐍', ['abdos'], 30, false, 'sol', [], ['Allongé sur le ventre, mains sous les épaules.', 'Redresse doucement le buste, bassin au sol, sans pincer le bas du dos.']),
  S('st-cou', 'Cou, inclinaison sur le côté', '🧣', ['cou'], 20, true, 'assis', [], ['Assis ou debout, épaules basses.', 'Penche l’oreille vers l’épaule, sans lever l’épaule.']),
  S('st-livre', 'Ouverture du haut du dos (livre ouvert)', '📖', ['dos', 'pectoraux'], 30, true, 'sol', [], ['Allongé sur le côté, genoux pliés, bras tendus devant.', 'Ouvre le bras du dessus vers l’arrière en suivant la main des yeux.']),
  S('st-fente', 'Avant de la hanche, en fente', '🏃', ['hanches', 'quadriceps'], 30, true, 'sol', [], ['Un genou au sol (sur un tapis ou un vêtement), l’autre pied devant.', 'Avance doucement le bassin, buste droit, fessier serré.']),
  S('st-pigeon', 'Pigeon', '🕊️', ['fessiers', 'hanches'], 45, true, 'sol', [], ['Jambe avant pliée devant toi, jambe arrière tendue.', 'Garde le bassin droit, descends doucement le buste si c’est confortable.']),
  S('st-figure4', 'Fessier en « 4 », debout ou assis', '4️⃣', ['fessiers'], 30, true, 'debout', [], ['Cheville posée sur le genou opposé.', 'Assieds-toi en arrière (chaise, banc ou en appui) jusqu’à sentir le fessier.']),
  S('st-papillon', 'Papillon (adducteurs)', '🦋', ['hanches'], 45, false, 'assis', [], ['Assis, plantes de pied l’une contre l’autre.', 'Laisse descendre les genoux, dos droit, sans appuyer fort.']),
  S('st-ischio-marche', 'Arrière des cuisses, talon sur une marche', '🪜', ['ischios'], 30, true, 'debout', [], ['Talon sur une marche ou un banc bas, jambe tendue.', 'Penche le buste vers l’avant, dos plat, jusqu’à sentir l’arrière de la cuisse.']),
  S('st-ischio-elastique', 'Arrière des cuisses avec élastique', '🎗️', ['ischios', 'mollets'], 30, true, 'sol', ['band'], ['Allongé sur le dos, élastique sous le pied, jambe tendue vers le haut.', 'Tire doucement, l’autre jambe reste au sol.']),
  S('st-pince', 'Pince assise', '🙇', ['ischios', 'lombaires'], 45, false, 'assis', [], ['Assis, jambes tendues devant toi.', 'Penche-toi depuis les hanches, dos long, sans tirer sur la nuque.']),
  S('st-quadri', 'Avant des cuisses, debout', '🦩', ['quadriceps'], 30, true, 'debout', [], ['Attrape ta cheville derrière toi, genoux côte à côte.', 'Bassin rentré ; appuie-toi à un mur pour l’équilibre.']),
  S('st-mollet', 'Mollet contre un mur, jambe tendue', '🦶', ['mollets'], 30, true, 'debout', [], ['Mains au mur, une jambe tendue derrière, talon au sol.', 'Avance doucement le bassin.']),
  S('st-soleaire', 'Mollet, genou plié', '🦵', ['mollets'], 30, true, 'debout', [], ['Comme l’étirement précédent, mais genou arrière légèrement plié.', 'Talon au sol : tu sens le bas du mollet.']),
  S('st-epaules-elastique', 'Passages d’épaules avec élastique', '🎗️', ['epaules', 'pectoraux'], 45, false, 'debout', ['band'], ['Élastique tenu large devant toi, bras tendus.', 'Monte au-dessus de la tête puis derrière, très lentement, sans forcer.']),
  S('st-espalier', 'Dorsaux en appui (poteau ou espalier)', '🪵', ['dos'], 30, true, 'debout', ['pole'], ['Attrape un poteau à hauteur de hanches, bras tendu.', 'Recule les fesses et laisse le flanc s’étirer.']),
];
const BREATH = { id: 'st-respiration', name: 'Respiration lente', emoji: '🌬️', zones: [], secs: 60, perSide: false, pos: 'assis', needs: [], cues: ['Inspire 4 secondes, expire 6 secondes.', 'Relâche les épaules et la mâchoire.'] };
/** Un étirement prend : ses côtés, une petite transition (le temps de se placer). */
export const stretchSeconds = (x, sets = 1) => sets * x.secs * (x.perSide ? 2 : 1) + sets * 10;

/** Zones travaillées par une séance (ou une séance faite), de la plus à la moins chargée, d'après ses muscles. */
export function zonesFromSession(s, musclesOf) {
  const score = {};
  for (const ex of s?.exercises || []) {
    const m = musclesOf(ex) || {}, sets = Math.max(1, Math.min(10, Number(Array.isArray(ex.sets) ? ex.sets.length : ex.sets) || 1));
    for (const [k, [, , ms]] of Object.entries(ZONES)) {
      const w = (m.prim || []).filter((x) => ms.includes(x)).length * 2 + (m.sec || []).filter((x) => ms.includes(x)).length;
      if (w) score[k] = (score[k] || 0) + w * sets;
    }
  }
  return Object.entries(score).sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

/**
 * Séance d'étirement : les zones dans l'ordre donné (la première est la plus importante), le matériel disponible, la
 * place au sol, la durée voulue (minutes). Chaque zone reçoit au moins un étirement ; le temps restant donne une 2e
 * série aux premières zones. Termine par une respiration lente (si au moins 6 min). Rien n'est inventé : uniquement le
 * catalogue ci-dessus.
 */
export function stretchPlan({ zones = [], minutes = 10, gear = [], floor = true, name = 'Étirements', forName = '' } = {}) {
  const want = [...new Set(zones.filter((z) => ZONES[z]))], have = new Set(gear), M = Math.max(3, Math.min(60, Math.round(Number(minutes) || 10))) * 60;
  const usable = STRETCHES.filter((x) => x.needs.every((n) => have.has(n)) && (floor || x.pos !== 'sol'));
  const order = want.length ? want : ['avantbras', 'epaules', 'dos', 'hanches', 'ischios'];
  const picks = [], used = new Set(), notes = [];
  let total = M >= 360 ? stretchSeconds(BREATH) : 0;
  // 1er passage : un étirement par zone, dans l'ordre d'importance ; 2e passage : un deuxième étirement par zone.
  for (let round = 0; round < 3 && total < M; round++) {
    for (const z of order) {
      const x = usable.find((y) => !used.has(y.id) && y.zones[0] === z) || usable.find((y) => !used.has(y.id) && y.zones.includes(z));
      if (!x) { if (!round && !usable.some((y) => y.zones.includes(z))) notes.push(`${ZONES[z][1]} : aucun étirement possible ici (matériel ou place au sol).`); continue; }
      const t = stretchSeconds(x); if (total + t > M + 30 && picks.length) continue;
      used.add(x.id); picks.push({ x, sets: 1 }); total += t;
    }
  }
  // Encore du temps : une série de plus, en commençant par les zones les plus importantes.
  for (let k = 0; total < M - 40 && k < picks.length * 2; k++) { const p = picks[k % picks.length]; const t = stretchSeconds(p.x); if (total + t > M + 30) break; p.sets++; total += t; }
  const list = M >= 360 ? [...picks, { x: BREATH, sets: 1 }] : picks;
  const exercises = list.map(({ x, sets }) => normalizeEx({ id: uid(), name: x.name, emoji: x.emoji, mode: 'time', sets, secMin: x.secs, secMax: x.secs, perSide: x.perSide, rest: 10, block: 'cool', part: '🧘 Étirements', intensity: 'low', ok: x.cues, note: x.zones.map((z) => ZONES[z][1]).join(', ') }));
  return {
    name: forName ? `🧘 Étirements après « ${forName} »`.slice(0, 100) : name, emoji: '🧘', exercises, minutes: Math.round(total / 60), zones: order, notes,
    tips: ['Doucement : un étirement se sent, il ne fait pas mal. Une douleur vive = tu arrêtes.', 'Respire lentement pendant chaque étirement.'],
  };
}
