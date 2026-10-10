// views-stretch.js — Bibliothèque › « 🧘 Étirements » (8.35) : une séance d'étirement adaptée à une séance (les zones
// qu'elle fait travailler, le lieu et son matériel, la place au sol, le délai après la séance et la durée voulue).
// « Toujours après cette séance » la relie à la séance (plusieurs possibles) ; en fin de séance, « dans X min » la
// programme dans le calendrier, avec un rappel qui la lance, ou la lance tout de suite.
import { h, chip, toast, ask, goHint } from './ui.js';
import { S, ACT, CHG, ctx, render, go, getSeance, saveSeance, saveEvent } from './state.js';
import { availableEquipment, exMuscles } from './brain.js';
import { EQUIPMENT } from './model.js';
import { uid } from './shared.js';
import { startPlayer, setQuizExtra, onSessionSaved, redrawPlayer } from './player.js';
import { ZONES, STRETCH_GEAR, zonesFromSession, stretchPlan } from './stretch.js';

const DELAYS = [[0, 'Juste après'], [30, '30 min après'], [60, '1 h après'], [120, '2 h après'], [240, 'Le soir (4 h après)']];
const LENGTHS = [5, 10, 15, 20, 30];
const isStretch = (s) => !!s?.stretch;
const mySeances = () => S.seances.items.filter((s) => !s.archived && !isStretch(s));
const stretchesFor = (id) => (getSeance(id)?.stretchIds || []).map(getSeance).filter(Boolean);
const musclesOf = (ex) => exMuscles(ex, ctx());
const gearOf = (envId) => { const eq = availableEquipment(ctx(), envId || ctx().defEnv?.id || ''); return STRETCH_GEAR.filter((k) => eq.has(k)); };
const st = () => (S.st ||= { forId: '', zones: [], envId: ctx().defEnv?.id || '', gear: gearOf(ctx().defEnv?.id), floor: true, delay: 0, minutes: 10, plan: null });

/** Choisir la séance : ses zones travaillées sont cochées (modifiables). */
function pickFor(id) { const v = st(); v.forId = id; const s = getSeance(id); v.zones = s ? zonesFromSession(s, musclesOf).slice(0, 6) : []; v.plan = null; }

export function vStretch() {
  const v = st(), x = ctx(), base = getSeance(v.forId), mine = S.seances.items.filter(isStretch);
  return h`<div class="card stack"><p class="small">Une séance d’étirement faite pour une de tes séances : l’app regarde les muscles qu’elle fait travailler, ton lieu et ton matériel. Si elle te plaît, elle te sera proposée à la fin de cette séance.</p></div>
    <div class="card stack">
      <label><b class="small">1. Pour quelle séance ?</b><select data-change="stFor"><option value="">Aucune : je choisis les zones</option>${mySeances().map((s) => h`<option value="${s.id}" ${v.forId === s.id ? 'selected' : ''}>${s.emoji || ''} ${s.name}</option>`)}</select></label>
      ${base ? h`<p class="tiny muted"><em>Zones cochées d’après les exercices de « ${base.name} ». Change-les si besoin.</em></p>` : ''}
      <b class="small">2. Quelles zones ?</b>
      <div class="chips">${Object.entries(ZONES).map(([k, [ic, l]]) => chip(v.zones.includes(k), `${ic} ${l}`, `data-act="stZone" data-id="${k}"`))}</div>
      <label><b class="small">3. Où vas-tu t’étirer ?</b><select data-change="stEnv">${x.envs.map((e) => h`<option value="${e.id}" ${v.envId === e.id ? 'selected' : ''}>${e.name}</option>`)}<option value="" ${!v.envId ? 'selected' : ''}>Ailleurs (sans matériel)</option></select></label>
      <div class="chips">${STRETCH_GEAR.filter((k) => EQUIPMENT[k]).map((k) => chip(v.gear.includes(k), EQUIPMENT[k], `data-act="stGear" data-id="${k}"`))}</div>
      <label class="chk"><input type="checkbox" data-change="stFloor" ${v.floor ? 'checked' : ''}> Je peux m’allonger au sol</label>
      <b class="small">4. Combien de temps après la séance ?</b>
      <div class="chips">${DELAYS.map(([m, l]) => chip(v.delay === m, l, `data-act="stDelay" data-id="${m}"`))}</div>
      <b class="small">5. Pendant combien de temps ?</b>
      <div class="chips">${LENGTHS.map((m) => chip(v.minutes === m, `${m} min`, `data-act="stLen" data-id="${m}"`))}</div>
      <button class="btn pri big" data-act="stMake">🧘 Préparer mes étirements</button>
    </div>
    ${v.plan ? planCard(v.plan, base) : ''}
    ${mine.length ? h`<span class="kicker">Mes séances d’étirement</span><div class="setmenu">${mine.map((s) => { const b = getSeance(s.stretch?.forId); return h`<div class="setrow"><span class="sic">🧘</span><span class="grow"><b>${s.name}</b><small>${s.exercises.length} étirements · ~${Math.round(s.durationMin || 0) || '?'} min${b ? ` · après « ${b.name} »${(b.stretchIds || []).includes(s.id) ? ' ✓' : ''}` : ''}</small></span><button class="btn sm pri" data-act="stPlay" data-id="${s.id}" aria-label="Lancer ${s.name}">▶</button></div>`; })}</div>` : ''}
    ${goHint('Pour voir les étirements reliés à une séance, ouvre-la dans', 'Bibliothèque › Mes séances', 'library/seances')}`;
}
function planCard(p, base) {
  return h`<div class="card stack" id="stplan"><h3 style="margin:0">${p.name}</h3><p class="small muted">~${p.minutes} min · ${p.exercises.length} étirements${S.st.delay ? ` · à faire ${DELAYS.find(([m]) => m === S.st.delay)?.[1].toLowerCase() || ''}` : ''}</p>
    <ul class="clean tight small">${p.exercises.map((e) => h`<li><b>${e.emoji} ${e.name}</b> — ${e.sets > 1 ? `${e.sets} × ` : ''}${e.secMin} s${e.perSide ? ' de chaque côté' : ''}${e.note ? h` <span class="tiny muted">(${e.note})</span>` : ''}</li>`)}</ul>
    ${p.notes.length ? h`<p class="tiny warn-t">${p.notes.join(' ')}</p>` : ''}
    <ul class="clean tight tiny muted">${p.tips.map((t) => h`<li>${t}</li>`)}</ul>
    <div class="row wrapf"><button class="btn pri" data-act="stPlayPlan">▶ Lancer maintenant</button><button class="btn" data-act="stSave">💾 Enregistrer</button>${base ? h`<button class="btn" data-act="stSave" data-link="1">📌 Me la proposer après « ${base.name} »</button>` : ''}</div></div>`;
}
const tog = (k) => (el) => { const v = st(), id = el.dataset.id; v[k] = v[k].includes(id) ? v[k].filter((x) => x !== id) : [...v[k], id]; v.plan = null; render(); };
ACT.stZone = tog('zones');
ACT.stGear = tog('gear');
CHG.stFor = (el) => { pickFor(el.value); render(); };
CHG.stEnv = (el) => { const v = st(); v.envId = el.value; v.gear = gearOf(el.value); v.plan = null; render(); };
CHG.stFloor = (el) => { st().floor = el.checked; st().plan = null; render(); };
ACT.stDelay = (el) => { st().delay = Number(el.dataset.id) || 0; st().plan = null; render(); };
ACT.stLen = (el) => { st().minutes = Number(el.dataset.id) || 10; st().plan = null; render(); };
/** Préparer : ce qui a été choisi, rien d'autre. Plus d'une heure après la séance : une minute de mise en route d'abord. */
ACT.stMake = () => {
  const v = st(), base = getSeance(v.forId);
  if (!v.zones.length) { toast('Coche au moins une zone (ou choisis une séance : ses zones seront cochées).', 4500); return; }
  v.plan = stretchPlan({ zones: v.zones, minutes: v.minutes, gear: v.gear, floor: v.floor, forName: base?.name || '' });
  if (v.delay >= 60) v.plan.tips.unshift('Plus d’une heure après la séance : commence par une minute à bouger doucement (bras, hanches) pour te réchauffer un peu.');
  render(); setTimeout(() => document.getElementById('stplan')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 60);
};
const asSeance = (p) => ({ name: p.name, emoji: '🧘', exercises: p.exercises, durationMin: p.minutes, source: 'generated', tags: ['étirements'], stretch: { forId: st().forId || '', delayMin: st().delay, groups: st().zones } });
ACT.stPlayPlan = () => { const p = st().plan; if (p) startPlayer({ id: 'st-' + uid().slice(0, 10), ...asSeance(p) }); };
ACT.stSave = (el) => {
  const v = st(), p = v.plan; if (!p) return;
  const n = saveSeance(asSeance(p));
  if (el.dataset.link === '1' && getSeance(v.forId)) { const b = getSeance(v.forId); saveSeance({ ...b, stretchIds: [...new Set([...(b.stretchIds || []), n.id])].slice(-6) }); toast(`Enregistrée : elle te sera proposée à la fin de « ${b.name} ».`, 4500); }
  else toast('Séance d’étirement enregistrée.');
  v.plan = null; render();
};
ACT.stPlay = (el) => { const s = getSeance(el.dataset.id); if (s) startPlayer(s); };
/** Depuis une séance : préparer des étirements pour elle (la séance est déjà choisie). */
ACT.stPrepare = (el) => { pickFor(el.dataset.id || ''); go('library', 'stretch'); };
ACT.stUnlink = async (el) => {
  const b = getSeance(el.dataset.base); if (!b) return;
  if (!(await ask('Ne plus proposer ces étirements après cette séance ?', { ok: 'Ne plus proposer', cancel: 'Annuler' }))) return;
  saveSeance({ ...b, stretchIds: (b.stretchIds || []).filter((x) => x !== el.dataset.id) }); render();
};

/** Sur la page d'une séance : ses étirements (plusieurs possibles), à lancer ou à préparer. */
export function seanceStretches(s) {
  if (!s || isStretch(s)) return '';
  const l = stretchesFor(s.id);
  return h`<section class="card stack"><h3 style="margin:0">🧘 Étirements après cette séance</h3>
    ${l.length ? h`<div class="setmenu">${l.map((x) => h`<div class="setrow"><span class="sic">🧘</span><span class="grow"><b>${x.name}</b><small>${x.exercises.length} étirements · ~${x.durationMin || '?'} min${x.stretch?.delayMin ? ` · ${x.stretch.delayMin} min après` : ' · juste après'}</small></span><button class="btn sm pri" data-act="stPlay" data-id="${x.id}" aria-label="Lancer ${x.name}">▶</button><button class="btn sm ghost" data-act="stUnlink" data-id="${x.id}" data-base="${s.id}" aria-label="Ne plus proposer ${x.name}">✕</button></div>`)}</div>
      <p class="tiny muted"><em>À la fin de cette séance, l’app te demandera quand les faire : tout de suite ou plus tard (avec un rappel).</em></p>`
      : h`<p class="tiny muted"><em>Aucune pour l’instant.</em></p>`}
    <button class="btn sm" data-act="stPrepare" data-id="${s.id}">＋ Préparer des étirements pour cette séance</button></section>`;
}

/* ───────── Fin de séance : « dans X minutes » ───────── */
const LATER = [[0, 'Maintenant'], [15, 'Dans 15 min'], [30, 'Dans 30 min'], [60, 'Dans 1 h'], [120, 'Dans 2 h'], [240, 'Dans 4 h']];
// Le délai choisi en préparant les étirements est proposé d'office ; « Pas cette fois » reste à un geste.
const choiceOf = (p, l) => { const ch = p.stretchChoice || {}, x = getSeance(ch.id) || l[0]; return { id: x.id, min: ch.min ?? (LATER.some(([m]) => m === x.stretch?.delayMin) ? x.stretch.delayMin : 0) }; };
setQuizExtra((p) => {
  const l = stretchesFor(p.s?.id); if (!l.length) return '';
  const ch = choiceOf(p, l);
  return h`<div class="card stack"><b class="small">🧘 Tes étirements après cette séance</b>
    ${l.length > 1 ? h`<div class="chips">${l.map((x) => chip(ch.id === x.id, `${x.name.replace(/^🧘\s*/, '')} (~${x.durationMin || '?'} min)`, `data-act="stQuizPick" data-id="${x.id}"`))}</div>` : h`<p class="small">${l[0].name} · ~${l[0].durationMin || '?'} min</p>`}
    <div class="chips">${LATER.map(([m, t]) => chip(ch.min === m, t, `data-act="stQuizWhen" data-id="${m}"`))}${chip(ch.min === -1, 'Pas cette fois', 'data-act="stQuizWhen" data-id="-1"')}</div>
    <p class="tiny muted"><em>${ch.min > 0 ? `Programmé dans le calendrier quand tu enregistres, avec un rappel qui la lance.` : ch.min === 0 ? 'Elle démarre dès que tu enregistres ta séance.' : 'Choisis quand, puis enregistre ta séance.'}</em></p></div>`;
});
ACT.stQuizPick = (el) => { if (!S.player) return; S.player.stretchChoice = { ...(S.player.stretchChoice || {}), id: el.dataset.id }; redrawPlayer(); };
ACT.stQuizWhen = (el) => { if (!S.player) return; S.player.stretchChoice = { ...(S.player.stretchChoice || {}), min: Number(el.dataset.id) }; redrawPlayer(); };
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
onSessionSaved((p) => {
  const l = stretchesFor(p.s?.id); if (!l.length) return; const ch = choiceOf(p, l); if (ch.min < 0) return;
  const s = getSeance(ch.id) || l[0];
  if (ch.min === 0) { setTimeout(() => startPlayer(s), 400); return; }
  // Arrondi aux 5 minutes suivantes ; rappel 1 minute avant, qui ouvre et lance la séance d'étirement.
  const at = new Date(Date.now() + ch.min * 60000); at.setMinutes(Math.ceil(at.getMinutes() / 5) * 5, 0, 0);
  saveEvent({ id: uid(), date: at.toLocaleDateString('en-CA'), time: hhmm(at), title: `🧘 ${s.name.replace(/^🧘\s*/, '')}`.slice(0, 120), sessionId: s.id, completed: false, recurrence: null,
    meta: { kind: 'stretch', playId: s.id, reminderMin: 1, minutes: s.durationMin || 10 } });
  toast(`🧘 Étirements programmés à ${hhmm(at)} : un rappel les lancera.`, 5000);
});

/* ───────── L'app est ouverte à l'heure prévue : on propose de lancer ───────── */
const asked = new Set();
function dueStretch() {
  if (!S.user || S.player || document.visibilityState !== 'visible') return;
  const now = Date.now(), today = new Date().toLocaleDateString('en-CA');
  const e = (S.events || []).find((x) => x.meta?.kind === 'stretch' && x.date === today && !x.completed && x.time && !asked.has(x.id) && (() => { const [hh, mm] = x.time.split(':').map(Number), t = new Date(); t.setHours(hh, mm, 0, 0); return now >= t.getTime() - 60000 && now - t.getTime() < 30 * 60000; })());
  if (!e) return; asked.add(e.id);
  const s = getSeance(e.meta.playId || e.sessionId); if (!s) return;
  ask(`C’est l’heure de tes étirements (${s.name.replace(/^🧘\s*/, '')}). On y va ?`, { ok: '▶ Lancer', cancel: 'Plus tard' }).then((yes) => { if (yes) startPlayer(s); });
}
if (typeof setInterval === 'function' && typeof document !== 'undefined') { setInterval(dueStretch, 60000); document.addEventListener?.('visibilitychange', dueStretch); }
