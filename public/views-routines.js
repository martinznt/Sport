// views-routines.js — Profil › « 🧩 Mes phases » (avant : Bibliothèque › Mes moments) : les blocs que tu aimes glisser dans tes séances
// (élastiques à l'échauffement, no foot ou spray wall en fin de séance…). Ils sont proposés dans « Créer une séance »
// (étape « Ta structure »), au bon endroit et adaptés à la séance. Conseil spray wall d'après tes séances notées.
import { h, openSheet, closeSheet, toast, goHint } from './ui.js';
import { S, ACT, SUBMIT, ctx, render, putItem, delItem, itemsOf } from './state.js';
import { uid } from './shared.js';
import { EQUIPMENT, ACTIVITIES } from './model.js';
import { LIBRARY, byId } from './library.js';
import { WHEN, EFFORT, ROUTINE_PRESETS, sprayAdvice, isSpray } from './routines.js';

const NEEDS = ['band', 'wall', 'spraywall', 'boardwall', 'hangboard', 'campus', 'bar', 'mat', 'weights', 'kettlebell', 'pool'].filter((k) => EQUIPMENT[k]);
const sportsAll = () => { const x = ctx(); return [...new Set([...Object.keys(x.activities), ...Object.keys(ACTIVITIES)])].filter((id) => x.activities[id] || ACTIVITIES[id]); };
const sportName = (id) => { const a = ctx().activities[id] || ACTIVITIES[id]; return a ? `${a.emoji || ''} ${a.label || id}`.trim() : id; };
export const myRoutines = () => itemsOf('routine').sort((a, b) => Object.keys(WHEN).indexOf(a.when) - Object.keys(WHEN).indexOf(b.when) || String(a.label).localeCompare(String(b.label)));
const sub = (r) => [`${r.minutes || 10} min`, EFFORT[r.effort] || 'Moyen', (r.sports || []).length ? r.sports.map((s) => sportName(s).replace(/^\S+\s/, '')).join(', ') : 'tous les sports',
  (r.needs || []).length ? `🧰 ${r.needs.map((k) => EQUIPMENT[k] || k).join(', ').toLowerCase()}` : '', r.text ? '📝 consigne' : byId(r.libId) ? `💪 ${byId(r.libId).name}` : '', r.auto ? '⚡ ajouté tout seul' : '', r.off ? '⏸ en pause' : ''].filter(Boolean).join(' · ');

export function vRoutines() {
  const l = myRoutines(), x = ctx(), adv = sprayAdvice(x.history, Date.now());
  const sprayOn = l.some((r) => isSpray(r) && !r.off) || x.envs.some((e) => (e.equipment || []).includes('spraywall'));
  return h`<div class="card stack"><p class="small">Les phases que tu glisses souvent dans tes séances : élastiques à l’échauffement, no foot ou spray wall à la fin… Quand tu crées une séance de ce sport, l’app te les propose toutes ; un toucher les ajoute au bon endroit.</p>
      <button class="btn pri" data-act="roNew">＋ Ajouter une phase</button></div>
    ${l.length ? Object.entries(WHEN).map(([w, [ic, t]]) => { const g = l.filter((r) => r.when === w); return g.length ? h`<span class="kicker">${ic} ${t}</span><div class="setmenu">${g.map((r) => h`<button class="setrow" data-act="roEdit" data-id="${r.id}"><span class="sic">${r.emoji || '🧩'}</span><span class="grow"><b>${r.label}</b><small>${sub(r)}</small></span><span class="chev">›</span></button>`)}</div>` : ''; })
      : h`<div class="card flat"><p class="small muted">Aucune phase pour l’instant. Pars d’un modèle (élastiques, no foot, spray wall…) avec « ＋ Ajouter une phase ».</p></div>`}
    ${goHint('Pour les placer dans une séance, va dans', 'Bibliothèque › Créer une séance', 'library/climbplan')}
    ${sprayOn ? h`<section class="card stack"><h3 style="margin:0">🧱 Conseil spray wall</h3><b class="small">${adv.title}</b><ul class="clean tight small">${adv.how.map((t) => h`<li>${t}</li>`)}</ul><p class="tiny muted">Pourquoi : ${adv.why}.</p>
      ${byId(adv.libId) ? h`<p class="tiny muted">Exercice conseillé : ${byId(adv.libId).emoji} ${byId(adv.libId).name}.</p>` : ''}</section>` : ''}`;
}

/** Fiche d'une phase : l'essentiel d'abord (nom, sport, moment, durée, contenu), le reste dans « Plus d'options ». */
function sheet(r = {}) {
  const lib = [...LIBRARY].sort((a, b) => a.name.localeCompare(b.name)), text = r.text ? 'text' : r.libId || !r.id ? 'ex' : 'time';
  openSheet(h`<h2 style="margin:0">${r.id ? 'Modifier la phase' : 'Nouvelle phase'}</h2>
    ${r.id ? '' : h`<span class="kicker">Partir d’un modèle <span class="tiny muted">(facultatif)</span></span><div class="chips">${ROUTINE_PRESETS.map((p) => h`<button type="button" class="chip" data-act="roPreset" data-id="${p.key}">${p.emoji} ${p.label}</button>`)}</div>`}
    <form class="stack" data-submit="roSave"><input type="hidden" name="id" value="${r.id || ''}">
      <label>Nom<input name="label" required maxlength="60" value="${r.label || ''}" placeholder="Ex. Spray wall, No foot, Élastiques"></label>
      <span class="kicker">Pour quel sport ? <span class="tiny muted">(rien coché = tous)</span></span>
      <div class="chips">${sportsAll().map((id) => h`<label class="chip ${(r.sports || []).includes(id) ? 'on' : ''}"><input type="checkbox" class="hidden" name="sports" value="${id}" ${(r.sports || []).includes(id) ? 'checked' : ''} data-change="chipToggle">${sportName(id)}</label>`)}</div>
      <div class="grid2"><label>Quand ?<select name="when">${Object.entries(WHEN).map(([k, [ic, t]]) => h`<option value="${k}" ${(r.when || 'end') === k ? 'selected' : ''}>${ic} ${t}</option>`)}</select></label>
        <label>Durée<span class="unitbox"><input type="number" name="minutes" min="3" max="90" step="1" value="${r.minutes || 10}"><em>min</em></span></label></div>
      <span class="kicker">Pendant cette phase</span>
      <label class="chk"><input type="radio" name="content" value="ex" ${text === 'ex' ? 'checked' : ''}> Un exercice de l’app <span class="tiny muted">(ses consignes s’affichent pendant la séance)</span></label>
      <select name="libId" aria-label="Exercice de la phase"><option value="">Choisis l’exercice…</option>${lib.map((x) => h`<option value="${x.id}" ${r.libId === x.id ? 'selected' : ''}>${x.emoji} ${x.name}</option>`)}</select>
      <label class="chk"><input type="radio" name="content" value="text" ${text === 'text' ? 'checked' : ''}> Pas d’exercice : juste une consigne</label>
      <textarea name="text" maxlength="600" rows="3" placeholder="Ex. Spray wall libre : invente des passages courts, un essai toutes les 2 à 3 minutes.">${r.text || ''}</textarea>
      <label class="chk"><input type="radio" name="content" value="time" ${text === 'time' ? 'checked' : ''}> Juste un temps chronométré</label>
      <details class="how mini"><summary>Plus d’options</summary><div class="stack">
        <label>Effort<select name="effort">${Object.entries(EFFORT).map(([k, t]) => h`<option value="${k}" ${(r.effort || 'mod') === k ? 'selected' : ''}>${t}</option>`)}</select></label>
        <label>Emoji<input name="emoji" maxlength="8" value="${r.emoji || ''}" placeholder="🧩" style="max-width:90px"></label>
        <span class="kicker">Matériel nécessaire <span class="tiny muted">(signalé s’il manque dans le lieu)</span></span>
        <div class="chkgrid">${[...NEEDS, ...Object.keys(EQUIPMENT).filter((k) => k.startsWith('my-'))].map((k) => h`<label class="chk"><input type="checkbox" name="needs" value="${k}" ${(r.needs || []).includes(k) ? 'checked' : ''}> ${EQUIPMENT[k]}</label>`)}</div>
        <label class="chk"><input type="checkbox" name="fingers" ${r.fingers ? 'checked' : ''}> Ça charge les doigts <span class="tiny muted">(l’app l’allège après une phase dure)</span></label>
        <label class="chk"><input type="checkbox" name="auto" ${r.auto ? 'checked' : ''}> L’ajouter tout seul quand il convient</label>
        ${r.id ? h`<label class="chk"><input type="checkbox" name="off" ${r.off ? 'checked' : ''}> En pause (ne plus la proposer)</label>` : ''}
        <label>Note <span class="tiny muted">(facultatif)</span><input name="note" maxlength="200" value="${r.note || ''}" placeholder="Ex. sur le dévers, prises bonnes"></label>
      </div></details>
      <button class="btn pri">Enregistrer</button></form>
    ${r.id ? h`<button class="btn ghost danger" data-act="roDel" data-id="${r.id}">Supprimer cette phase</button>` : ''}`);
}
ACT.roNew = () => sheet();
ACT.roEdit = (el) => { const r = myRoutines().find((x) => x.id === el.dataset.id); if (r) sheet(r); };
ACT.roPreset = (el) => { const p = ROUTINE_PRESETS.find((x) => x.key === el.dataset.id); if (p) { const { key, ...d } = p; sheet(d); } };
SUBMIT.roSave = (f) => {
  const fd = new FormData(f), d = Object.fromEntries(fd), id = d.id || 'ro-' + uid().slice(0, 12);
  if (String(d.label || '').trim().length < 2) { toast('Donne un nom à cette phase.'); return; }
  const content = ['ex', 'text', 'time'].includes(d.content) ? d.content : 'ex', text = String(d.text || '').trim().slice(0, 600);
  if (content === 'ex' && !d.libId) { toast('Choisis l’exercice, ou coche « Pas d’exercice : juste une consigne ».', 4500); return; }
  if (content === 'text' && text.length < 3) { toast('Écris la consigne à afficher pendant la phase.', 4000); return; }
  putItem('routine', id, { label: d.label, emoji: d.emoji || '', when: d.when, minutes: Number(d.minutes) || 10, effort: d.effort || 'mod', libId: content === 'ex' ? d.libId || '' : '', text: content === 'text' ? text : '',
    sports: fd.getAll('sports'), needs: fd.getAll('needs'), fingers: fd.has('fingers'), auto: fd.has('auto'), off: fd.has('off'), note: d.note || '' });
  closeSheet(); toast('Phase enregistrée : elle sera proposée dans « Créer une séance ».', 3500); render();
};
ACT.roDel = (el) => { delItem('routine', el.dataset.id); closeSheet(); toast('Phase supprimée.'); render(); };
