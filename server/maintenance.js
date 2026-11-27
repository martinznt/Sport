// server/maintenance.js — mode maintenance : état dans system_state (aucune migration), liste des appareils à prévenir.
// - 'maintenance'      : { on, message, since, by, allow:[ids de comptes autorisés] }
// - 'munlock:<empreinte de session>' : { t } — un administrateur a saisi le mot de passe administrateur (12 h)
// - 'mwait:<empreinte de l'abonnement>' : { endpoint, at, ready } — appareil à prévenir au retour du site
import { sendPush } from './push.js';
const q = (env, sql, ...a) => env.DB.prepare(sql).bind(...a);
export const UNLOCK_MS = 12 * 3600 * 1000, MAX_WAITERS = 2000, MAX_ALLOW = 50;
export const DEFAULT_MESSAGE = 'Une mise à jour est en cours. Le site est indisponible pour l’instant.';
const hex = async (t) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, '0')).join('');
const parse = (s) => { try { return JSON.parse(s); } catch { return null; } };
const put = (env, key, v) => q(env, 'INSERT INTO system_state(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', key, JSON.stringify(v)).run();

export async function getMaint(env) {
  const row = await q(env, "SELECT value FROM system_state WHERE key='maintenance'").first(), v = parse(row?.value) || {};
  return { on: v.on === true, message: String(v.message || '').slice(0, 300) || DEFAULT_MESSAGE, since: Number(v.since) || 0, by: String(v.by || ''), allow: Array.isArray(v.allow) ? v.allow.filter((x) => typeof x === 'string').slice(0, MAX_ALLOW) : [] };
}
export const setMaint = (env, m) => put(env, 'maintenance', { on: !!m.on, message: m.message, since: m.since, by: m.by, allow: m.allow || [] });
export async function isUnlocked(env, tokenHash) {
  if (!tokenHash) return false;
  const row = await q(env, 'SELECT value FROM system_state WHERE key=?', 'munlock:' + tokenHash).first(), v = parse(row?.value);
  return !!v && Date.now() - (v.t || 0) < UNLOCK_MS;
}
export const unlock = (env, tokenHash) => put(env, 'munlock:' + tokenHash, { t: Date.now() });
/** Accès autorisé : administrateur déverrouillé, ou compte autorisé par un administrateur. */
export async function mayEnter(env, m, auth, adminConfigured) {
  if (!auth) return false;
  if (m.allow.includes(auth.user.id)) return true;
  if (!auth.user.isAdmin) return false;
  if (!adminConfigured) return true; // sans mot de passe administrateur configuré, jamais d'administrateur bloqué dehors
  return isUnlocked(env, auth.hash);
}
export async function addWaiter(env, endpoint, cancel = false) {
  const key = 'mwait:' + await hex(endpoint);
  if (cancel) { await q(env, 'DELETE FROM system_state WHERE key=?', key).run(); return true; }
  const n = await q(env, "SELECT COUNT(*) c FROM system_state WHERE key LIKE 'mwait:%'").first();
  if (Number(n?.c) >= MAX_WAITERS) return false;
  await put(env, key, { endpoint, at: Date.now(), ready: false });
  return true;
}
export async function countWaiters(env) { return Number((await q(env, "SELECT COUNT(*) c FROM system_state WHERE key LIKE 'mwait:%'").first())?.c) || 0; }
/** Message à afficher si cet appareil a été prévenu (consommé une fois). */
export async function takeReady(env, endpoint) {
  if (!endpoint) return null;
  const key = 'mwait:' + await hex(endpoint), row = await q(env, 'SELECT value FROM system_state WHERE key=?', key).first(), v = parse(row?.value);
  if (!v?.ready) return null;
  await q(env, 'DELETE FROM system_state WHERE key=?', key).run();
  return { title: 'Séances entraînement : le site est de retour', body: 'La mise à jour est terminée. Tu peux rouvrir le site.', url: '/' };
}
/** Prévient les appareils inscrits (notification vide, texte demandé ensuite au serveur). */
export async function notifyWaiters(env, fetchFn = fetch) {
  const rows = (await q(env, "SELECT key,value FROM system_state WHERE key LIKE 'mwait:%' LIMIT 500").all()).results || [];
  let sent = 0, gone = 0, errors = 0;
  for (const r of rows) {
    const v = parse(r.value); if (!v?.endpoint) { await q(env, 'DELETE FROM system_state WHERE key=?', r.key).run(); continue; }
    await put(env, r.key, { ...v, ready: true });
    const res = await sendPush(env, v.endpoint, fetchFn);
    if (res === 'ok') sent++; else if (res === 'gone') { gone++; await q(env, 'DELETE FROM system_state WHERE key=?', r.key).run(); } else errors++;
  }
  return { total: rows.length, sent, gone, errors };
}
