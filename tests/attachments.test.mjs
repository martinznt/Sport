// tests/attachments.test.mjs — 8.35 : captures d'écran jointes aux signalements, propositions et à l'assistant admin.
// Vérifie : vrai type d'image (pas d'après le nom), taille et nombre bornés, lecture réservée aux administrateurs du bon
// rôle, réponse servie comme image sans script, effacement avec le compte, et image transmise à Gemini seulement.
import assert from 'node:assert/strict';
import { makeEnv, Client } from './helpers.mjs';
import { cleanImages, sniff } from '../server/attachments.js';
import { buildGeminiInput } from '../server/gemini.js';

let n = 0; const ok = async (name, fn) => { await fn(); n++; console.log('  ✓', name); };
const b64 = (bytes) => Buffer.from(Uint8Array.from(bytes)).toString('base64');
const JPEG = b64([0xff, 0xd8, 0xff, 0xe0, ...Array(200).fill(7), 0xff, 0xd9]);
const PNG = b64([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(64).fill(1)]);
const HTML_AS_IMAGE = Buffer.from('<html><script>alert(1)</script></html>').toString('base64');
const ADMIN_PW = 'Adm1n-Secret!';

await ok('type réel lu dans les octets : JPEG, PNG, WebP acceptés ; une page HTML déguisée refusée', () => {
  assert.equal(sniff(Buffer.from(JPEG, 'base64')), 'image/jpeg');
  assert.equal(sniff(Buffer.from(PNG, 'base64')), 'image/png');
  assert.equal(sniff(Buffer.from('RIFF0000WEBPVP8 ')), 'image/webp');
  assert.equal(cleanImages([{ data: 'data:image/png;base64,' + HTML_AS_IMAGE }]).error, 'Seules les images JPEG, PNG ou WebP sont acceptées.');
  assert.match(cleanImages([{ data: JPEG }, { data: JPEG }, { data: JPEG }]).error, /2 captures/);
  assert.match(cleanImages([{ data: b64([0xff, 0xd8, 0xff, ...Array(600_000).fill(0)]) }]).error, /trop lourde/);
  assert.match(cleanImages([{ data: 'pas du base64 !' }]).error, /illisible/);
  assert.deepEqual(cleanImages(undefined), { images: [] });
});

const env = makeEnv(), member = new Client(env), admin = new Client(env), other = new Client(env);
await member.register('CaptureMembre'); await admin.register('CaptureAdmin'); await other.register('CaptureAutre');
assert.equal((await admin.post('/api/admin/activate', { password: ADMIN_PW })).status, 200);
let shotId = '';

await ok('signalement avec capture : enregistré, la capture n’est visible que par un administrateur', async () => {
  const r = await member.post('/api/bugs', { id: 'bug-capture-1', title: 'Bouton coupé', description: 'Le bouton Lancer est coupé à droite.', page: 'library/seances', images: [{ data: JPEG }] });
  assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.images, 1);
  const list = await admin.get('/api/admin/bugs'); const bug = list.data.reports.find((b) => b.id === 'bug-capture-1');
  assert.equal(bug.images.length, 1); shotId = bug.images[0];
  const img = await admin.get('/api/admin/attachments/' + shotId);
  assert.equal(img.status, 200); assert.equal(img.res.headers.get('Content-Type'), 'image/jpeg');
  assert.equal(img.res.headers.get('X-Content-Type-Options'), 'nosniff'); assert.match(img.res.headers.get('Content-Security-Policy'), /sandbox/);
  assert.deepEqual([...new Uint8Array(await img.res.arrayBuffer())].slice(0, 3), [0xff, 0xd8, 0xff]);
  for (const c of [member, other, new Client(env)]) assert.notEqual((await c.get('/api/admin/attachments/' + shotId)).status, 200, 'membre ou anonyme : refusé');
});

await ok('fausse image ou trop d’images : refusé avec un message, et le signalement n’est pas créé à moitié', async () => {
  const r = await member.post('/api/bugs', { id: 'bug-capture-2', description: 'Texte valable mais image piégée.', images: [{ data: HTML_AS_IMAGE }] });
  assert.equal(r.status, 413); assert.match(r.data.error, /JPEG, PNG ou WebP/);
  const r3 = await member.post('/api/bugs', { id: 'bug-capture-3', description: 'Trop de captures.', images: [{ data: JPEG }, { data: JPEG }, { data: PNG }] });
  assert.equal(r3.status, 413);
  const ids = (await admin.get('/api/admin/bugs')).data.reports.map((b) => b.id);
  assert.ok(!ids.includes('bug-capture-2') && !ids.includes('bug-capture-3'));
});

await ok('proposition d’amélioration avec capture : visible dans la liste des administrateurs', async () => {
  const r = await member.post('/api/proposals', { kind: 'idea', label: 'Texte peu clair', detail: 'Ce texte n’est pas clair, voir la capture.', images: [{ data: PNG }] });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const p = (await admin.get('/api/admin/proposals')).data.proposals.find((x) => x.label === 'Texte peu clair');
  assert.equal(p.images.length, 1); assert.equal((await admin.get('/api/admin/attachments/' + p.images[0])).res.headers.get('Content-Type'), 'image/png');
});

await ok('rôle vérifié par le serveur : un administrateur « contenu » seul ne voit pas les captures des signalements', async () => {
  const content = new Client(env); await content.register('CaptureContenu');
  assert.equal((await content.post('/api/admin/activate', { password: ADMIN_PW })).status, 200);
  const id = (await admin.get('/api/admin/users')).data.users.find((u) => u.username === 'CaptureContenu').id;
  const set = await admin.post(`/api/admin/users/${id}/roles`, { roles: ['content'] }); assert.equal(set.status, 200, JSON.stringify(set.data));
  assert.equal((await content.get('/api/admin/attachments/' + shotId)).status, 404, 'capture d’un signalement : rôle technique requis');
  const prop = (await content.get('/api/admin/proposals')).data.proposals.find((x) => x.label === 'Texte peu clair');
  assert.equal((await content.get('/api/admin/attachments/' + prop.images[0])).status, 200, 'capture d’une proposition : rôle contenu suffit');
});

await ok('assistant : une capture est refusée clairement si le modèle choisi ne lit pas les images', async () => {
  const e2 = makeEnv({ AI: { run: async () => { throw new Error('ne doit jamais être appelé'); } } }), a = new Client(e2);
  await a.register('CaptureAs'); assert.equal((await a.post('/api/admin/activate', { password: ADMIN_PW })).status, 200);
  const r = await a.post('/api/admin/assistant', { messages: [{ role: 'user', content: 'Que vois-tu sur cette capture ?' }], images: [{ data: JPEG }] });
  assert.equal(r.status, 400); assert.match(r.data.error, /Gemini/);
});

await ok('assistant avec Gemini : la capture part dans la demande, à côté du message, et la réponse revient', async () => {
  const real = globalThis.fetch; let sent = null;
  globalThis.fetch = async (url, o) => {
    if (String(url).startsWith('https://eutils.ncbi.nlm.nih.gov/')) return new Response('', { status: 503 });
    sent = JSON.parse(o.body);
    return Response.json({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify({ status: 'ok', sources: ['request', 'app/map'], reply: 'Sur la capture, le bouton Lancer dépasse de l’écran.', changes: [] }) }] } }] });
  };
  try {
    const e3 = makeEnv({ GEMINI_API_KEY: 'cle-de-test-captures' }), a = new Client(e3);
    await a.register('CaptureGem'); assert.equal((await a.post('/api/admin/activate', { password: ADMIN_PW })).status, 200);
    const r = await a.post('/api/admin/assistant', { messages: [{ role: 'user', content: 'Regarde la capture : qu’est-ce qui ne va pas ?' }], images: [{ data: JPEG }] });
    assert.equal(r.status, 200, JSON.stringify(r.data)); assert.match(r.data.reply, /capture/);
    const parts = sent.contents.at(-1).parts;
    assert.equal(parts.at(-1).inline_data.mime_type, 'image/jpeg'); assert.equal(parts.at(-1).inline_data.data, JPEG);
    assert.ok(parts.some((p) => typeof p.text === 'string' && p.text.includes('Regarde la capture')));
    assert.match(sent.systemInstruction.parts.map((p) => p.text).join('\n'), /capture d’écran de l’app est jointe/);
  } finally { globalThis.fetch = real; }
});

await ok('format Gemini : sans image, aucune partie image ; un type non accepté n’est jamais envoyé', () => {
  const plain = buildGeminiInput({ messages: [{ role: 'user', content: 'Bonjour' }] });
  assert.ok(!JSON.stringify(plain).includes('inline_data'));
  const bad = buildGeminiInput({ messages: [{ role: 'user', content: 'x' }], images: [{ mime: 'text/html', data: 'PGh0bWw+' }] });
  assert.ok(!JSON.stringify(bad).includes('inline_data'));
});

await ok('compte supprimé : ses captures sont effacées', async () => {
  const before = env.DB.raw.prepare('SELECT COUNT(*) n FROM attachments').get().n;
  assert.ok(before >= 2);
  assert.equal((await member.post('/api/auth/delete', { password: 'motdepasse1' })).status, 200);
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) n FROM attachments").get().n, 0);
});
console.log(`${n} tests OK`);
