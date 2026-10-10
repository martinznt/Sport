// srcui.js — affichage des sources : petits liens « 📚 Auteur année » sous un conseil, fiche de la référence.
import { h, raw, openSheet } from './ui.js';
import { ACT, api } from './state.js';
import { SOURCES, sourceRefs, siteOf, exerciseSources } from './sources.js';

const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
/** 8.35 : repère « 📚 Sources » avec l'icône de chaque site ; un toucher ouvre la liste de tous les liens. */
const siteIcon = (s) => { const [name, abbr, color] = siteOf(s); return h`<span class="srcico" style="--c:${color}" title="${name}" aria-hidden="true">${abbr}</span>`; };
export const sourcesLine = (ids = [], { claim = '' } = {}) => {
  const r = sourceRefs(ids); if (!r.length) return '';
  const sites = [...new Map(r.map((x) => [siteOf(x)[0], x])).values()];
  return h`<div class="srcs"><button type="button" class="srcbadge" data-act="srcList" data-ids="${r.map((x) => x.id).join(',')}" data-claim="${claim}" aria-label="Voir les ${r.length} source${r.length > 1 ? 's' : ''}${claim ? ' : ' + claim : ''}">📚 Sources <span class="srcicos">${sites.map(siteIcon)}</span><span class="tiny muted">${r.length}</span></button></div>`;
};
/** Sur la fiche d'un exercice : ce qui est appuyé par une étude, ligne par ligne, et ce qui vient de la pratique. */
export function exerciseSourcesBlock(e) {
  const rows = exerciseSources(e);
  return h`<section class="card flat stack tight"><b class="small">📚 D’où viennent ces conseils</b>
    <p class="tiny muted">Technique : ${e.src ? `« ${e.src} »` : 'pratique courante d’entraînement'} — aucune étude citée pour ce geste précis.</p>
    ${rows.map((x) => h`<div class="row wrapf" style="gap:6px"><span class="tiny grow brk">${x.claim}</span>${sourcesLine(x.ids, { claim: x.claim })}</div>`)}</section>`;
}
export const aiProposalReady = (proposal) => proposal?.status === 'ok' && ['app', 'request', 'profile', 'research'].includes(proposal.basis) && Array.isArray(proposal.sources) && proposal.sources.length > 0 && proposal.sources.every((s) => s && typeof s.id === 'string' && typeof s.label === 'string' && s.label.trim() && ['app', 'request', 'profile', 'research'].includes(s.kind)) && ['request', 'app/model'].every((id) => proposal.sources.some((s) => s.id === id));
/** Origine d'une proposition IA : seules les références renvoyées par le serveur sont affichées. */
export function aiEvidence(proposal = {}) {
  const sources = (Array.isArray(proposal.sources) ? proposal.sources : []).slice(0, 8).filter((s) => s && typeof s.label === 'string').map((s) => {
    let url = '';
    try {
      const rawUrl = String(s.url || ''), u = new URL(rawUrl);
      if (rawUrl.length <= 2048 && !/[\u0000-\u0020\u007f]/.test(rawUrl) && u.protocol === 'https:' && !u.username && !u.password && !/^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[)/i.test(u.hostname) && !/\.(local|localhost)$/i.test(u.hostname)) url = u.href;
    } catch { /* une référence interne n'a pas de lien externe */ }
    const checkedAt = typeof s.checkedAt === 'string' && Number.isFinite(Date.parse(s.checkedAt)) ? new Date(s.checkedAt).toISOString() : '';
    return { label: s.label.slice(0, 180), kind: s.kind, url, checkedAt };
  });
  if (!sources.length) return '';
  const labels = { app: 'Référence interne de l’app', request: 'Texte fourni par toi', profile: 'Déclarations du profil partagé', research: 'Article scientifique' };
  const research = sources.some((s) => s.kind === 'research' && s.checkedAt);
  return h`<details class="how mini ai-sources"><summary>📚 Sources utilisées</summary><ul class="clean tiny">${sources.map((s) => h`<li>${labels[s.kind] ? h`<span class="muted">${labels[s.kind]} · </span>` : ''}${s.url ? h`${siteIcon({ url: s.url })} <a href="${/^https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/\d+\/?$/.test(s.url) ? s.url + '#abstract' : s.url}" target="_blank" rel="noopener noreferrer">${s.label}</a>` : s.label}${s.checkedAt ? h`<span class="muted"> · consulté le ${new Date(s.checkedAt).toLocaleDateString('fr-FR')}</span>` : ''}</li>`)}</ul><p class="tiny muted">${research ? 'Les articles consultés ne garantissent pas le résultat de cet entraînement pour toi.' : 'Ces références expliquent l’origine de la proposition ; elles ne valident pas son efficacité scientifique.'}</p></details>`;
}
/* « Voir le passage » : le serveur a lu le résumé de l'article sur PubMed et renvoie un lien qui fait défiler jusqu'à la
 * phrase exacte (surlignée par le navigateur). Sans réponse : le lien ouvre l'article (son résumé sur PubMed). */
const passages = new Map();
const fragEnc = (t) => encodeURIComponent(t).replace(/-/g, '%2D').replace(/,/g, '%2C').replace(/&/g, '%26');
const fragment = (text) => { const w = String(text || '').trim().replace(/[.!?]+$/, '').split(/\s+/); return w[0] ? '#:~:text=' + (w.length <= 12 ? fragEnc(w.join(' ')) : fragEnc(w.slice(0, 6).join(' ')) + ',' + fragEnc(w.slice(-6).join(' '))) : ''; };
const safeUrl = (u) => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : ''; } catch { return ''; } };
function linksOf(id) {
  const s = SOURCES[id] || {}, p = passages.get(id), base = safeUrl(s.url), pub = /^https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/\d+\/?$/.test(base);
  if (p?.url) return { passage: p.url, quote: p.passage || '', page: base };
  if (s.passage && base) return { passage: base.split('#')[0] + fragment(s.passage), quote: s.passage, page: base }; // passage copié par un administrateur
  return { passage: '', quote: '', page: pub ? base + '#abstract' : base };
}
function card(id, claim) {
  const s = SOURCES[id]; if (!s) return '';
  const [site] = siteOf(s), l = linksOf(id);
  return h`<div class="card flat stack tight"><div class="row" style="gap:8px;align-items:flex-start">${siteIcon(s)}<div class="grow brk"><b class="small">${s.title}</b><div class="tiny muted">${s.authors} · ${s.year} · <i>${s.journal}</i> · ${site}</div></div></div>
<p class="tiny"><b>Ce qu’elle montre :</b> ${s.key}</p>
    ${l.quote ? h`<blockquote class="tiny srcquote">« ${l.quote} »</blockquote>` : ''}
    <div class="row wrapf">${l.passage ? raw(`<a class="btn sm pri" href="${esc(l.passage)}" target="_blank" rel="noopener noreferrer">🎯 Voir le passage ↗</a>`) : ''}${l.page ? raw(`<a class="btn sm" href="${esc(l.page)}" target="_blank" rel="noopener noreferrer">${l.passage ? 'Article entier ↗' : 'Ouvrir la source ↗'}</a>`) : ''}</div></div>`;
}
function listSheet(ids, claim) {
  openSheet(h`<div class="stack"><span class="kicker">📚 Sources</span><h2 style="margin:0">${ids.length > 1 ? `${ids.length} sources` : 'La source'}${claim ? h` <span class="small muted">· ${claim}</span>` : ''}</h2>
    <p class="tiny muted"><em>« 🎯 Voir le passage » ouvre la source à la phrase qui donne l’information, surlignée (selon le navigateur). Les études sont des repères, pas un avis médical.</em></p>
    ${ids.map((id) => card(id, claim))}<button class="btn ghost" data-act="closeSheet">Fermer</button></div>`);
}
async function loadPassages(ids, claim) {
  const need = ids.filter((id) => !passages.has(id) && !SOURCES[id]?.global); if (!need.length) return;
  try { const r = await api('GET', '/api/sources/passages?ids=' + need.join(',')); for (const id of need) passages.set(id, r.passages?.[id] || null); }
  catch { return; } // hors ligne : les liens ouvrent l'article
  if (document.querySelector('#sheet.open .kicker')?.textContent.includes('Sources')) listSheet(ids, claim);
}
ACT.srcList = (el) => { const ids = String(el.dataset.ids || '').split(',').filter((id) => SOURCES[id]); if (!ids.length) return; const claim = el.dataset.claim || ''; listSheet(ids, claim); loadPassages(ids, claim); };
ACT.srcOpen = (el) => ACT.srcList({ dataset: { ids: el.dataset.id, claim: '' } });
