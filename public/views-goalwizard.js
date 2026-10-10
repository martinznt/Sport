// views-goalwizard.js — 8.35 : « Nouvel objectif » en deux temps, sans jargon.
// 1. « Que veux-tu ? » en grands boutons ; 2. deux ou trois réglages, une cible proposée d'après ta DERNIÈRE VALEUR
// réelle (jamais inventée : sans valeur, la cible est à écrire), puis une phrase qui résume l'objectif avant de
// l'enregistrer. Le formulaire complet reste disponible pour modifier un objectif existant.
import { h, chip, openSheet, closeSheet, toast, buzzOk, fmtDay } from './ui.js';
import { S, ACT, CHG, INPUT, ctx, go, putItem } from './state.js';
import { uid } from './shared.js';
import { SKILLS } from './model.js';
import { sortedLevels, gradeSnapshot } from './grading.js';
import { latestPerf } from './brain.js';
import { nextStep } from './assess.js';

const KINDS = [
  ['grade', '🧗', 'Réussir un niveau en escalade', 'Ex. un 6b en bloc, un 6c en voie'],
  ['project', '📍', 'Réussir un bloc ou une voie précis', 'Ton projet : le bloc du dévers, la voie de la falaise'],
  ['metric', '💪', 'Améliorer un chiffre', 'Tractions, suspension, 5 km, pompes, souplesse…'],
  ['skill', '🤸', 'Réussir une figure', 'Front lever, drapeau, poirier, muscle-up…'],
  ['regular', '📅', 'M’entraîner régulièrement', 'Ex. 3 séances par semaine pendant 2 mois'],
  ['words', '✍️', 'Autre chose, avec mes mots', 'Écris-le : l’app en fait une fiche que tu relis'],
];
// Mesures proposées en premier selon les sports suivis (toutes restent dans « Autre mesure »).
const POPULAR = {
  climbing: ['suspension_20mm', 'max_tractions', 'blocage_90', 'traction_lestee'], strength: ['max_tractions', 'max_pompes', 'squat_1rm', 'souleve_1rm'],
  conditioning: ['max_pompes', 'planche_avant_bras', 'gainage_lateral', 'saut_vertical'], running: ['course_5k', 'course_10k', 'vma', 'course_semi'],
  swimming: ['nage_100', 'nage_400', 'nage_continue'], calisthenics: ['front_lever_groupe', 'max_dips', 'handstand_mur', 'l_sit'],
};
const WHEN = [[0, 'Sans date'], [1, 'Dans 1 mois'], [3, 'Dans 3 mois'], [6, 'Dans 6 mois']];
const gw = () => (S.gw ||= { kind: '', months: 0, perWeek: 3, weeks: 8, disc: 'max_bloc' });
const deadlineOf = (months) => { if (!months) return ''; const d = new Date(); d.setMonth(d.getMonth() + months); return d.toLocaleDateString('en-CA'); };
const popular = (c) => { const acts = Object.keys(c.activities).map((a) => (a.startsWith('climbing') ? 'climbing' : a)); const ids = [...new Set((acts.length ? acts : ['strength']).flatMap((a) => POPULAR[a] || []))]; return ids.filter((id) => c.metrics[id]).slice(0, 8); };

/** Ce que l'objectif deviendra, en une phrase (affichée avant d'enregistrer). */
function summary(v, c) {
  const when = v.months ? ` d’ici le ${fmtDay(new Date(deadlineOf(v.months)).getTime())}` : '';
  if (v.kind === 'grade') { const sys = c.systems[v.sys]; const l = sortedLevels(sys).find((x) => x.id === v.level); return l ? `Réussir ${l.label} en ${v.disc === 'max_voie' ? 'voie' : 'bloc'}${when}.` : ''; }
  if (v.kind === 'metric') { const m = c.metrics[v.metric]; return m && Number.isFinite(Number(v.target)) && v.target !== '' ? `${m.label} : ${v.target} ${m.unit === 'reps' ? 'rép.' : m.unit}${when}.` : ''; }
  if (v.kind === 'skill') return SKILLS[v.skill] ? `Réussir ${SKILLS[v.skill].label}${when}.` : '';
  if (v.kind === 'regular') return `${v.perWeek} séance${v.perWeek > 1 ? 's' : ''} par semaine pendant ${v.weeks} semaines (${v.perWeek * v.weeks} séances).`;
  return '';
}
function settings(v, c) {
  const dateChips = h`<b class="small">Pour quand ?</b><div class="chips">${WHEN.map(([m, l]) => chip(v.months === m, l, `data-act="gwSet" data-k="months" data-v="${m}"`))}</div>`;
  if (v.kind === 'grade') {
    const act = v.disc === 'max_voie' ? 'voie' : 'bloc', systems = Object.values(c.systems).filter((s) => !s.archived && (s.activity === act || s.activity === 'autre'));
    if (!c.systems[v.sys] || !systems.includes(c.systems[v.sys])) { v.sys = systems[0]?.id || ''; v.level = ''; }
    const sys = c.systems[v.sys], levels = sortedLevels(sys), step = nextStep(c, v.disc), max = latestPerf(v.disc, c);
    if (!v.level && step?.gradeTarget && step.gradeTarget.systemId === v.sys) v.level = step.gradeTarget.levelId;
    return h`<b class="small">En bloc ou en voie ?</b><div class="chips">${[['max_bloc', 'Bloc'], ['max_voie', 'Voie']].map(([k, l]) => chip(v.disc === k, l, `data-act="gwSet" data-k="disc" data-v="${k}"`))}</div>
      ${systems.length > 1 ? h`<label>Cotation<select data-change="gwVal" data-k="sys">${systems.map((s) => h`<option value="${s.id}" ${s.id === v.sys ? 'selected' : ''}>${s.name}</option>`)}</select></label>` : ''}
      <p class="tiny muted"><em>${max?.grade ? `Ton maximum noté : ${max.grade.label}${step ? ` — le niveau suivant est proposé.` : '.'}` : 'Aucun maximum noté : choisis le niveau que tu vises.'}</em></p>
      <b class="small">Niveau visé</b><div class="chips">${levels.map((l) => chip(v.level === l.id, l.label, `data-act="gwSet" data-k="level" data-v="${l.id}"`))}</div>${dateChips}`;
  }
  if (v.kind === 'metric') {
    const pop = popular(c), m = c.metrics[v.metric], last = m ? latestPerf(v.metric, c) : null, step = m ? nextStep(c, v.metric) : null;
    if (m && v.target === undefined) v.target = step?.target ?? '';
    return h`<b class="small">Quel chiffre ?</b><div class="chips">${pop.map((id) => chip(v.metric === id, c.metrics[id].label, `data-act="gwMetric" data-v="${id}"`))}</div>
      <label>Autre mesure<select data-change="gwMetricSel"><option value="">— choisir dans toutes les mesures —</option>${Object.entries(c.metrics).filter(([, x]) => !x.archived && x.kind !== 'grade').sort((a, b) => a[1].label.localeCompare(b[1].label, 'fr')).map(([id, x]) => h`<option value="${id}" ${v.metric === id && !pop.includes(id) ? 'selected' : ''}>${x.label}</option>`)}</select></label>
      ${m ? h`<p class="tiny muted"><em>${last ? `Ta dernière valeur : ${last.value} ${m.unit === 'reps' ? 'rép.' : m.unit} (${fmtDay(last.date)}).${step ? ' La cible proposée est une marche réaliste au-dessus ; change-la si tu veux.' : ''}` : 'Pas encore de valeur notée : écris ta cible, puis note ton premier résultat dans Profil › Records et mesures.'}</em></p>
        <label>Ma cible <span class="tiny muted">(${m.unit === 'reps' ? 'répétitions' : m.unit || 'valeur'}${m.dir === -1 ? ', plus bas = mieux' : ''})</span><input type="text" inputmode="decimal" data-input="gwTarget" value="${v.target ?? ''}" placeholder="Ex. ${m.unit === 'reps' ? '12' : m.unit === 's' ? '20' : '…'}"></label>${dateChips}` : ''}`;
  }
  if (v.kind === 'skill') return h`<b class="small">Quelle figure ?</b><div class="chips">${Object.entries(SKILLS).map(([id, s]) => chip(v.skill === id, `${s.emoji} ${s.label}`, `data-act="gwSet" data-k="skill" data-v="${id}"`))}</div>
      <p class="tiny muted"><em>L’app découpe la figure en étapes et te dit laquelle travailler.</em></p>${dateChips}`;
  if (v.kind === 'regular') return h`<b class="small">Combien de séances par semaine ?</b><div class="chips">${[1, 2, 3, 4, 5, 6, 7].map((n) => chip(v.perWeek === n, String(n), `data-act="gwSet" data-k="perWeek" data-v="${n}"`))}</div>
      <b class="small">Pendant combien de temps ?</b><div class="chips">${[[4, '1 mois'], [8, '2 mois'], [12, '3 mois'], [26, '6 mois']].map(([w, l]) => chip(v.weeks === w, l, `data-act="gwSet" data-k="weeks" data-v="${w}"`))}</div>`;
  return '';
}
function sheet() {
  const v = gw(), c = ctx();
  if (!v.kind) return openSheet(h`<div class="stack"><h2 style="margin:0">🎯 Nouvel objectif</h2><p class="small muted">Choisis ce qui ressemble le plus à ton objectif. Tout se change ensuite.</p>
    <div class="setmenu">${KINDS.map(([k, ic, t, d]) => h`<button class="setrow" data-act="gwKind" data-id="${k}"><span class="sic">${ic}</span><span class="grow"><b>${t}</b><small>${d}</small></span><span class="chev">›</span></button>`)}</div>
    <p class="tiny muted"><em>Tes envies générales (progresser, être plus fort, plus souple…) se cochent en haut de la page Objectifs : elles orientent les séances. Un objectif précis ajoute un but suivi, avec sa progression.</em></p></div>`);
  const [, ic, title] = KINDS.find(([k]) => k === v.kind) || [];
  const sum = summary(v, c);
  openSheet(h`<div class="stack"><button type="button" class="btn sm ghost" data-act="gwKind" data-id="">‹ Autre type d’objectif</button><h2 style="margin:0">${ic} ${title}</h2>
    ${settings(v, c)}
    <div class="card flat ${sum ? 'acc-b' : ''}"><b class="small">Ton objectif</b><p class="small" style="margin:.2em 0 0">${sum || 'Complète les choix ci-dessus.'}</p>${sum ? h`<p class="tiny muted"><em>L’app orientera tes séances vers ce but et suivra ta progression dans Profil › Objectifs.</em></p>` : ''}</div>
    <button class="btn pri big" data-act="gwSave" ${sum ? '' : 'disabled'}>✓ Enregistrer l’objectif</button></div>`);
}
export function openGoalWizard() { S.gw = null; sheet(); }
ACT.gwKind = (el) => {
  const k = el.dataset.id || '';
  if (k === 'project') { closeSheet(); setTimeout(() => ACT.projNew?.(), 120); return; }
  if (k === 'words') { closeSheet(); setTimeout(() => ACT.goalWrite?.({ dataset: {} }), 120); return; }
  S.gw = { ...gw(), kind: k }; sheet();
};
ACT.gwSet = (el) => { const v = gw(), k = el.dataset.k, raw = el.dataset.v; v[k] = ['months', 'perWeek', 'weeks'].includes(k) ? Number(raw) : raw; if (k === 'disc') v.level = ''; sheet(); };
ACT.gwMetric = (el) => { const v = gw(); v.metric = el.dataset.v; v.target = undefined; sheet(); };
CHG.gwMetricSel = (el) => { if (!el.value) return; const v = gw(); v.metric = el.value; v.target = undefined; sheet(); };
CHG.gwVal = (el) => { const v = gw(); v[el.dataset.k] = el.value; if (el.dataset.k === 'sys') v.level = ''; sheet(); };
// La cible se tape sans redessiner (le clavier reste ouvert) ; seul le résumé et le bouton sont mis à jour.
INPUT.gwTarget = (el) => {
  const v = gw(); v.target = el.value.replace(',', '.').trim(); const c = ctx(), sum = summary(v, c);
  const box = el.closest('.panel'); if (!box) return;
  const p = box.querySelector('.card.flat p.small'), btn = box.querySelector('[data-act=gwSave]');
  if (p) p.textContent = sum || 'Complète les choix ci-dessus.'; if (btn) btn.disabled = !sum;
};
ACT.gwSave = () => {
  const v = gw(), c = ctx(), now = Date.now(), base = { status: 'active', startedAt: now, deadline: deadlineOf(v.months), label: '' };
  let g = null;
  if (v.kind === 'grade') { const sys = c.systems[v.sys]; const t = gradeSnapshot(sys, v.level); if (!t) return toast('Choisis le niveau visé.'); g = { ...base, type: 'grade', metricId: v.disc, gradeTarget: t, label: `${v.disc === 'max_voie' ? 'Voie' : 'Bloc'} ${t.label}` }; }
  if (v.kind === 'metric') { const m = c.metrics[v.metric], target = Number(v.target); if (!m || !Number.isFinite(target)) return toast('Écris une cible (un nombre).'); g = { ...base, type: 'metric', metricId: v.metric, target, unit: m.unit || '', label: `${m.label} : ${target} ${m.unit === 'reps' ? 'rép.' : m.unit || ''}`.trim() }; }
  if (v.kind === 'skill') { const s = SKILLS[v.skill]; if (!s) return toast('Choisis une figure.'); const ex = c.goals.find((x) => x.skillId === v.skill && (x.status || 'active') === 'active'); if (ex) { closeSheet(); go('profile', 'goals', ex.id); return toast('Cet objectif existe déjà : le voici.'); } g = { ...base, type: 'skill', skillId: v.skill, label: s.label }; }
  if (v.kind === 'regular') { const d = new Date(); d.setDate(d.getDate() + v.weeks * 7); g = { ...base, type: 'sessions', target: v.perWeek * v.weeks, deadline: d.toLocaleDateString('en-CA'), label: `${v.perWeek} séance${v.perWeek > 1 ? 's' : ''} par semaine pendant ${v.weeks} semaines` }; }
  if (!g) return;
  const id = 'g-' + uid().slice(0, 12); putItem('goal', id, g); S.gw = null; closeSheet(); buzzOk(); toast('Objectif enregistré'); go('profile', 'goals', id);
};
