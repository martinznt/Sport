// tests/maintenance.test.mjs — mode maintenance : blocage côté SERVEUR, mot de passe administrateur, comptes autorisés, notifications.
import assert from 'node:assert/strict';
import { Client, makeEnv, ok, done } from './helpers.mjs';

const env = makeEnv();
const A = new Client(env), B = new Client(env), U = new Client(env), V = new Client(env), anon = new Client(env);
await A.register('adm'); await B.register('adm2'); await U.register('membre'); await V.register('ami');
for (const c of [A, B]) assert.equal((await c.post('/api/admin/activate', { password: 'Adm1n-Secret!' })).status, 200);
const EP = 'https://fcm.googleapis.com/fcm/send/abc123';

await ok('hors maintenance : tout fonctionne et le statut dit « off »', async () => {
  assert.equal((await U.get('/api/settings')).status !== 503, true);
  const s = (await anon.get('/api/maintenance/status')).data; assert.equal(s.on, false); assert.equal(s.allowed, true);
});
await ok('seul un administrateur peut démarrer ; un membre reçoit 403', async () => {
  assert.equal((await U.post('/api/admin/maintenance-mode', { action: 'start' })).status, 403);
  assert.equal((await anon.post('/api/admin/maintenance-mode', { action: 'start' })).status, 401);
  assert.equal((await A.post('/api/admin/maintenance-mode', { action: 'start', message: 'Mise à jour en cours' })).status, 200);
});
await ok('membres et visiteurs bloqués côté serveur (503), inscription comprise', async () => {
  for (const [c, m, p] of [[U, 'GET', '/api/settings'], [U, 'GET', '/api/history'], [anon, 'GET', '/api/global'], [anon, 'POST', '/api/auth/register'], [U, 'GET', '/api/public/u/adm'], [U, 'POST', '/api/admin/activate']]) {
    const r = await c.call(m, p, m === 'GET' ? undefined : { username: 'zz', password: 'motdepasse1', password2: 'x' }); assert.equal(r.status, 503, m + ' ' + p); assert.equal(r.data.maintenance, true);
  }
  const s = (await U.get('/api/maintenance/status')).data; assert.equal(s.on, true); assert.equal(s.message, 'Mise à jour en cours'); assert.equal(s.allowed, false);
});
await ok('l’administrateur qui démarre reste dedans ; un autre administrateur doit saisir le mot de passe administrateur', async () => {
  assert.notEqual((await A.get('/api/settings')).status, 503);
  const r = await B.get('/api/settings'); assert.equal(r.status, 503); assert.equal(r.data.needsAdminPassword, true);
  assert.equal((await B.post('/api/maintenance/unlock', { password: 'faux' })).status, 403);
  assert.equal((await B.get('/api/settings')).status === 503, true, 'mauvais mot de passe : toujours bloqué');
  assert.equal((await B.post('/api/maintenance/unlock', { password: 'Adm1n-Secret!' })).status, 200);
  assert.notEqual((await B.get('/api/settings')).status, 503);
});
await ok('un membre connu du mot de passe administrateur entre ; sans lui, jamais', async () => {
  assert.equal((await U.post('/api/maintenance/unlock', { password: 'nope' })).status, 403);
  assert.equal((await anon.post('/api/maintenance/unlock', { password: 'Adm1n-Secret!' })).status, 401, 'il faut un compte');
  assert.equal((await U.get('/api/settings')).status, 503);
});
await ok('connexion toujours possible pendant la maintenance (un administrateur ne peut pas être bloqué dehors)', async () => {
  const C = new Client(env); const r = await C.post('/api/auth/login', { username: 'adm', password: 'motdepasse1' }); assert.equal(r.status, 200);
  assert.equal((await C.get('/api/settings')).status, 503, 'nouvelle session : mot de passe administrateur à ressaisir');
  assert.equal((await C.post('/api/maintenance/unlock', { password: 'Adm1n-Secret!' })).status, 200);
  assert.notEqual((await C.get('/api/settings')).status, 503);
});
await ok('compte autorisé par un administrateur : accès ; retiré : bloqué', async () => {
  assert.equal((await A.post('/api/admin/maintenance-mode', { action: 'allow', username: 'AMI' })).status, 200);
  assert.notEqual((await V.get('/api/settings')).status, 503);
  const st = (await A.get('/api/admin/maintenance-mode')).data; assert.deepEqual(st.allowed.map((x) => x.username), ['ami']);
  assert.equal((await A.post('/api/admin/maintenance-mode', { action: 'allow', username: 'inconnu' })).status, 404);
  assert.equal((await A.post('/api/admin/maintenance-mode', { action: 'disallow', username: 'ami' })).status, 200);
  assert.equal((await V.get('/api/settings')).status, 503);
});
await ok('« me prévenir » : inscription sans compte, adresse de service validée', async () => {
  assert.equal((await anon.post('/api/maintenance/notify', { endpoint: 'https://evil.example/x' })).status, 400);
  assert.equal((await anon.post('/api/maintenance/notify', { endpoint: EP })).status, 200);
  assert.equal((await A.get('/api/admin/maintenance-mode')).data.waiting, 1);
});
await ok('arrêt avec notification : appareil prévenu, message de retour livré une seule fois, site rouvert pour tous', async () => {
  const calls = []; const real = globalThis.fetch; globalThis.fetch = async (u) => { calls.push(String(u)); return new Response(null, { status: 201 }); };
  try {
    assert.equal((await U.post('/api/admin/maintenance-mode', { action: 'stop' })).status, 503, 'un membre ne peut pas l’arrêter');
    const r = await A.post('/api/admin/maintenance-mode', { action: 'stop', notify: true });
    assert.equal(r.status, 200); assert.equal(r.data.on, false); assert.equal(r.data.notified.sent, 1);
  } finally { globalThis.fetch = real; }
  assert.deepEqual(calls, [EP]);
  assert.notEqual((await U.get('/api/settings')).status, 503);
  const m1 = (await anon.get('/api/push/message?endpoint=' + encodeURIComponent(EP))).data; assert.match(m1.title, /de retour/);
  const m2 = (await anon.get('/api/push/message?endpoint=' + encodeURIComponent(EP))).data; assert.doesNotMatch(m2.title || '', /de retour/);
});
await ok('sans mot de passe administrateur configuré, un administrateur n’est jamais bloqué', async () => {
  const e2 = makeEnv({ EDIT_PASSWORD: '' }); const X = new Client(e2), Y = new Client(e2);
  await X.register('admx'); await Y.register('membrey');
  await e2.DB.prepare('UPDATE users SET is_admin=1 WHERE username=?').bind('admx').run();
  assert.equal((await X.post('/api/admin/maintenance-mode', { action: 'start' })).status, 200);
  assert.notEqual((await X.get('/api/settings')).status, 503); assert.equal((await Y.get('/api/settings')).status, 503);
});
done('tests de maintenance');
