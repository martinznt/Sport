// views-maintenance.js — mode maintenance : écran pour les membres (message, « me prévenir », entrée administrateur)
// et réglages pour les administrateurs. Le blocage réel est fait par le serveur (503) ; ceci n'est que l'affichage.
import { h, toast, ask } from './ui.js';
import { S, ACT, SUBMIT, api, render } from './state.js';

const unb64u = (s) => Uint8Array.from(atob(s.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
let pollT = null;
const pollOff = () => { clearInterval(pollT); pollT = null; };
function poll() {
  if (pollT) return;
  pollT = setInterval(async () => {
    try { const r = await fetch('/api/maintenance/status', { cache: 'no-store', credentials: 'same-origin' }).then((x) => x.json()); if (!r.on || r.allowed) location.reload(); } catch { /* hors ligne : on réessaie */ }
  }, 30000);
}
/** Appelé par le réseau (réponse 503 « maintenance ») ou au démarrage : affiche l'écran. */
export function showMaintenance(d) {
  S.maint = { ...(S.maint || {}), ...d, blocked: true };
  poll(); render();
}
export async function checkMaintenance() {
  try {
    const r = await fetch('/api/maintenance/status', { cache: 'no-store', credentials: 'same-origin' }).then((x) => (x.ok ? x.json() : null));
    if (r?.on && !r.allowed) showMaintenance(r);
  } catch { /* hors ligne : rien à afficher */ }
}
export function vMaintenance() {
  const m = S.maint || {};
  return h`<main class="auth wrap"><div class="center"><img class="app-logo" src="/icon-192.png" alt="" width="84" height="84"><h1>🚧 Mise à jour en cours</h1>
    <p class="lead">${m.message || 'Une mise à jour est en cours. Le site est indisponible pour l’instant.'}</p>
    <p class="muted small">Tes données sont en sécurité. Cette page se rouvre toute seule quand le site revient.</p></div>
    <div class="card stack"><h3>🔔 Être prévenu</h3>
      ${m.waiting ? h`<p class="small">✅ C’est noté : tu recevras une notification quand le site sera de nouveau disponible.</p><button class="btn ghost" data-act="maintNotifyCancel">Annuler</button>`
        : h`<p class="small muted">Coche cette option et on t’envoie une notification dès que le site revient.</p><button class="btn pri" data-act="maintNotify">Me prévenir quand le site est disponible</button>`}</div>
    <details class="card how" ${m.open || m.error ? 'open' : ''}><summary><b>Je suis administrateur</b></summary>
      <form data-submit="maintAdmin" class="stack" autocomplete="off">
        ${m.signedIn ? h`<p class="small muted">Tu es connecté. Saisis le mot de passe administrateur pour entrer.</p>` : h`<label>Pseudo ou e-mail<input type="text" name="username" autocomplete="username" autocapitalize="none" required></label>
          <label>Mot de passe de ton compte<input type="password" name="password" autocomplete="current-password" required></label>`}
        <label>Mot de passe administrateur<input type="password" name="admin" autocomplete="off" required></label>
        <div class="err" role="alert">${m.error || ''}</div><button class="btn pri" type="submit">Entrer</button></form></details></main>`;
}
ACT.maintNotify = async () => {
  try {
    if (!('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window)) throw new Error('Ce navigateur ne permet pas les notifications.');
    if ((await Notification.requestPermission()) !== 'granted') throw new Error('Les notifications sont refusées dans ce navigateur : autorise-les dans ses réglages.');
    const reg = await navigator.serviceWorker.ready; let sub = await reg.pushManager.getSubscription();
    if (!sub) { const { key } = await api('GET', '/api/push/key', undefined, { guestOk: true }); sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: unb64u(key) }); }
    await api('POST', '/api/maintenance/notify', { endpoint: sub.endpoint }, { guestOk: true });
    S.maint.waiting = true; render();
  } catch (e) { toast(e.message || 'Impossible d’activer la notification.', 5000, 'bad'); }
};
ACT.maintNotifyCancel = async () => {
  try { const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription(); if (sub) await api('POST', '/api/maintenance/notify', { endpoint: sub.endpoint, cancel: true }, { guestOk: true }); S.maint.waiting = false; render(); }
  catch (e) { toast(e.message, 4000, 'bad'); }
};
SUBMIT.maintAdmin = async (form) => {
  const f = new FormData(form), btn = form.querySelector('button[type=submit]'); btn.disabled = true; S.maint.error = '';
  try {
    if (!S.maint.signedIn) { await api('POST', '/api/auth/login', { username: f.get('username'), password: f.get('password') }, { quiet401: true, guestOk: true }); S.maint.signedIn = true; }
    await api('POST', '/api/maintenance/unlock', { password: f.get('admin') }, { quiet401: true, guestOk: true });
    location.reload();
  } catch (e) { S.maint.error = e.offline ? 'Pas de connexion.' : e.message; S.maint.open = true; render(); }
};

/* ── Réglages (administrateurs, rôle Technique) ── */
const when = (t) => (t ? new Date(t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '');
async function load() {
  const a = S.admin;
  try { a.maint = await api('GET', '/api/admin/maintenance-mode'); a.maintErr = ''; } catch (e) { a.maintErr = e.offline ? 'Connexion requise.' : e.message; }
  if (S.tab === 'settings' && S.sub.settings === 'maintMode') render();
}
async function act(body, okMsg) {
  try { const r = await api('POST', '/api/admin/maintenance-mode', body); S.admin.maint = r; S.admin.maintErr = ''; if (r.notified) toast(`${r.notified.sent} appareil(s) prévenu(s)${r.notified.errors ? `, ${r.notified.errors} en erreur` : ''}.`, 5000); else if (okMsg) toast(okMsg); render(); }
  catch (e) { S.admin.maintErr = e.offline ? 'Connexion requise.' : e.message; render(); }
}
export function vMaintMode() {
  if (S.admin.maint === undefined) { S.admin.maint = null; load(); }
  const m = S.admin.maint;
  if (!m) return h`<section class="card">${S.admin.maintErr ? h`<p class="err small">${S.admin.maintErr}</p><button class="btn" data-act="maintReload">Réessayer</button>` : h`<p class="muted">Chargement…</p>`}</section>`;
  return h`<section class="card stack"><h3>${m.on ? '🚧 Maintenance EN COURS' : '✅ Site ouvert à tous'}</h3>
    ${m.on ? h`<p class="small">Depuis ${when(m.since)}${m.by ? ` · lancée par ${m.by}` : ''}. Les membres voient : « ${m.message} ». Les administrateurs qui ont saisi le mot de passe administrateur entrent.</p>
      <p class="small">📱 <b>${m.waiting}</b> appareil${m.waiting > 1 ? 's' : ''} à prévenir au retour du site.</p>
      <div class="stack"><button class="btn pri" data-act="maintStop" data-notify="1">Arrêter la maintenance et prévenir les membres</button>
      <button class="btn" data-act="maintStop" data-notify="0">Arrêter sans notification</button></div>`
      : h`<form class="stack" data-submit="maintStart"><label>Message montré aux membres<textarea name="message" rows="3" maxlength="300">${m.message}</textarea></label>
        <button class="btn danger" type="submit">Démarrer la maintenance</button>
        <p class="tiny muted">Dès le démarrage, les membres n’ont plus accès au site (vérifié par le serveur). Toi, tu restes dedans.</p></form>
        ${m.waiting ? h`<p class="small">📱 ${m.waiting} appareil${m.waiting > 1 ? 's' : ''} attendent encore une notification.</p><button class="btn" data-act="maintNotifyNow">Les prévenir maintenant</button>` : ''}`}
    ${S.admin.maintErr ? h`<p class="err small" role="alert">${S.admin.maintErr}</p>` : ''}</section>
    ${m.on ? h`<section class="card stack"><h3>Donner l’accès à un membre</h3><p class="small muted">Ces membres peuvent utiliser le site pendant la maintenance (liste effacée au prochain démarrage).</p>
      <form class="row" data-submit="maintAllow"><input name="username" placeholder="Pseudo du membre" maxlength="120" required aria-label="Pseudo du membre"><button class="btn" type="submit">Autoriser</button></form>
      ${m.allowed.length ? h`<ul class="clean">${m.allowed.map((u) => h`<li class="row between"><span>👤 ${u.username}</span><button class="btn sm ghost" data-act="maintDisallow" data-name="${u.username}">Retirer</button></li>`)}</ul>` : h`<p class="tiny muted">Aucun membre autorisé pour l’instant.</p>`}</section>` : ''}`;
}
ACT.maintReload = () => { S.admin.maint = undefined; render(); };
ACT.maintStop = (el) => act({ action: 'stop', notify: el.dataset.notify === '1' }, 'Maintenance arrêtée : le site est ouvert.');
ACT.maintNotifyNow = () => act({ action: 'notify' });
ACT.maintDisallow = (el) => act({ action: 'disallow', username: el.dataset.name }, 'Accès retiré.');
SUBMIT.maintAllow = (f) => { const u = new FormData(f).get('username'); f.reset(); return act({ action: 'allow', username: u }, 'Accès donné.'); };
SUBMIT.maintStart = async (f) => {
  const message = new FormData(f).get('message');
  if (!(await ask('Démarrer la maintenance ?', { ok: 'Démarrer', danger: true, detail: 'Tous les membres perdent l’accès au site tout de suite. Tu restes dedans.' }))) return;
  act({ action: 'start', message }, 'Maintenance démarrée.');
};
