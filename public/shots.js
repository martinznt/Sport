// shots.js — 8.35 : joindre une capture d'écran (signalement, proposition, assistant d'administration).
// L'image est réduite sur l'appareil (1600 px au plus, JPEG) pour peser moins de 500 Ko ; le serveur la vérifie
// encore (vrai type d'image, taille). Elle n'est vue que par les administrateurs.
import { h, toast, closeSheet } from './ui.js';
import { S, CHG, ACT, go } from './state.js';

export const MAX_SHOTS = 2;
const MAX_BYTES = 480_000, MAX_SIDE = 1600;
const box = () => (S.shots ||= {});
/** Captures en attente pour un formulaire (« bug », « idea », « prop », « as »). */
export const shotsOf = (key) => box()[key] || [];
export const clearShots = (key) => { delete box()[key]; };
/** Pour l'envoi au serveur : seulement les données de l'image. */
export const shotsPayload = (key) => shotsOf(key).map((x) => ({ data: x.data }));

const bytesOf = (b64) => Math.floor((b64.length * 3) / 4);
async function toJpeg(file) {
  if (!/^image\//.test(file.type || '')) throw new Error('Choisis une image (capture d’écran, photo).');
  const bmp = await (typeof createImageBitmap === 'function' ? createImageBitmap(file) : new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('Image illisible.')); i.src = URL.createObjectURL(file); }));
  let w = bmp.width, hh = bmp.height; const k = Math.min(1, MAX_SIDE / Math.max(w, hh)); w = Math.round(w * k); hh = Math.round(hh * k);
  const c = document.createElement('canvas'); c.width = w; c.height = hh;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, hh); g.drawImage(bmp, 0, 0, w, hh);
  // Qualité baissée pas à pas, puis taille réduite, jusqu'à passer sous la limite.
  for (let q = 0.85, scale = 1; scale > 0.3; q -= 0.12) {
    if (q < 0.45) { scale *= 0.75; q = 0.8; c.width = Math.round(w * scale); c.height = Math.round(hh * scale); const g2 = c.getContext('2d'); g2.fillStyle = '#fff'; g2.fillRect(0, 0, c.width, c.height); g2.drawImage(bmp, 0, 0, c.width, c.height); }
    const url = c.toDataURL('image/jpeg', q), data = url.split(',')[1] || '';
    if (bytesOf(data) <= MAX_BYTES) return { url, data, size: bytesOf(data) };
  }
  throw new Error('Capture trop lourde, même réduite : recadre-la puis réessaie.');
}

/** Le champ « 📎 Joindre une capture d'écran » avec ses aperçus (✕ pour retirer). */
export function shotField(key, { hint = '' } = {}) {
  const list = shotsOf(key);
  return h`<div class="shots stack tight" data-shots="${key}" data-hint="${hint}">
    ${list.length ? h`<div class="shotlist">${list.map((x, i) => h`<figure class="shot"><img src="${x.url}" alt="Capture jointe ${i + 1}"><button type="button" class="btn sm ic ghost" data-act="shotDrop" data-k="${key}" data-i="${i}" aria-label="Retirer la capture ${i + 1}">✕</button></figure>`)}</div>` : ''}
    ${list.length < MAX_SHOTS ? h`<label class="btn filebtn shotpick">📎 ${list.length ? 'Ajouter une autre capture' : 'Joindre une capture d’écran'}<input type="file" accept="image/*" class="hidden" data-change="shotPick" data-k="${key}"></label>` : ''}
    <p class="tiny muted"><em>Facultatif. ${hint || 'Fais une capture avec ton téléphone, puis choisis-la ici : elle aide à comprendre ta demande.'} Seuls les administrateurs la voient ; évite d’y laisser des informations personnelles.</em></p></div>`;
}
// Mise à jour sur place : le reste du formulaire (texte déjà écrit) ne bouge pas.
function refresh(key) { for (const n of document.querySelectorAll(`[data-shots="${CSS.escape(key)}"]`)) n.outerHTML = shotField(key, { hint: n.dataset.hint || '' }).s; }
CHG.shotPick = async (el) => {
  const key = el.dataset.k, file = el.files?.[0]; el.value = '';
  if (!key || !file) return;
  if (shotsOf(key).length >= MAX_SHOTS) { toast(`${MAX_SHOTS} captures au plus.`); return; }
  try { const x = await toJpeg(file); box()[key] = [...shotsOf(key), x]; refresh(key); toast('Capture jointe'); }
  catch (e) { toast(e.message || 'Image illisible.', 5000, 'bad'); }
};
ACT.shotDrop = (el) => { const key = el.dataset.k, i = Number(el.dataset.i); box()[key] = shotsOf(key).filter((_, k) => k !== i); refresh(key); };

/* ───────── Côté administrateurs ───────── */
/** Captures reçues (signalement ou proposition) : aperçus cliquables et « faire analyser par l'assistant ». */
export function shotsView(ids, kind, refId, context = '') {
  const list = (Array.isArray(ids) ? ids : []).filter((x) => /^[\w-]{1,64}$/.test(x)); if (!list.length) return '';
  return h`<div class="stack tight"><span class="tiny muted">📎 ${list.length > 1 ? `${list.length} captures jointes` : 'Capture jointe'} (touche pour l’agrandir)</span>
    <div class="shotlist">${list.map((id, i) => h`<a class="shot" href="/api/admin/attachments/${encodeURIComponent(id)}" target="_blank" rel="noopener"><img src="/api/admin/attachments/${encodeURIComponent(id)}" alt="Capture ${i + 1}" loading="lazy"></a>`)}</div>
    <button type="button" class="btn sm wrapbtn" data-act="shotAsk" data-ids="${list.join(',')}" data-kind="${kind}" data-ctx="${String(context).slice(0, 600)}">🔎 Analyser avec l’assistant</button></div>`;
}
/** Ouvre l'assistant du site avec la demande et les captures prêtes à partir (l'administrateur relit puis envoie). */
ACT.shotAsk = (el) => {
  const ids = String(el.dataset.ids || '').split(',').filter(Boolean).slice(0, MAX_SHOTS);
  S.admin ||= {}; S.admin.asAttach = ids; S.admin.draftFor = S.user?.id || '';
  S.admin.chatDraft = `Regarde la capture jointe (${el.dataset.kind === 'bug' ? 'signalement' : 'proposition'}) : ${el.dataset.ctx || ''}\nQu’est-ce qui ne va pas sur cet écran, et que proposes-tu pour le corriger ?`.slice(0, 1500);
  closeSheet(); go('settings', 'assistant');
};
