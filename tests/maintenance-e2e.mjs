// Mode maintenance dans un vrai navigateur : écran pour un visiteur, entrée administrateur, ouverture des réglages, arrêt.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { makeEnv, startServer } from './server.mjs';
import { Client } from './helpers.mjs';

const env = makeEnv({ EDIT_PASSWORD: 'Adm1n-Secret!' });
const adm = new Client(env); await adm.register('chefadmin'); await adm.post('/api/admin/activate', { password: 'Adm1n-Secret!' });
await adm.post('/api/items', { changes: [{ c: 'config', id: 'main', u: Date.now(), d: { setupDone: true, tourDone: true, asked: ['acts','place','minutes','perWeek','goal','avoid'] } }] });
const srv = await startServer(env), browser = await chromium.launch(process.env.PW_EXEC ? { executablePath: process.env.PW_EXEC } : {});
const context = await browser.newContext({ viewport: { width: 360, height: 700 }, serviceWorkers: 'block' }), page = await context.newPage(), errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const step = async (n, f) => { await f(); console.log('  ✓', n); };
assert.equal((await adm.post('/api/admin/maintenance-mode', { action: 'start', message: 'Mise à jour en cours, retour vite.' })).status, 200);
await step('un visiteur voit l’écran de maintenance, sans le site', async () => {
  await page.goto(srv.base + '/'); await page.waitForSelector('text=Mise à jour en cours');
  assert.ok(await page.locator('text=Mise à jour en cours, retour vite.').count());
  assert.ok(await page.locator('text=Me prévenir quand le site est disponible').count());
  assert.equal(await page.locator('text=Créer mon compte gratuit').count(), 0);
});
await step('mauvais mot de passe administrateur : refusé, message clair', async () => {
  await page.locator('summary:has-text("Je suis administrateur")').click();
  await page.fill('input[name=username]', 'chefadmin'); await page.fill('input[name=password]', 'motdepasse1'); await page.fill('input[name=admin]', 'faux');
  await page.click('button:has-text("Entrer")'); await page.waitForSelector('text=Mot de passe administrateur incorrect');
});
await step('bon mot de passe : le site s’ouvre et les réglages de maintenance sont accessibles', async () => {
  await page.fill('input[name=admin]', 'Adm1n-Secret!'); await page.click('button:has-text("Entrer")');
  await page.waitForFunction(() => document.querySelector('main') && !document.body.innerText.includes('Mise à jour en cours'), null, { timeout: 15000 });
  await page.evaluate(() => { location.hash = '#/settings/maintMode'; });
  await page.waitForSelector('text=Maintenance EN COURS');
  await page.screenshot({ path: process.env.SHOT || '/tmp/maint-admin.png' });
});
await step('arrêt depuis les réglages', async () => {
  await page.click('button:has-text("Arrêter sans notification")'); await page.waitForSelector('text=Site ouvert à tous');
  assert.equal((await new Client(env).get('/api/maintenance/status')).data.on, false);
});
assert.deepEqual(errors, []);
await browser.close(); await srv.close?.(); console.log('\n4 étapes navigateur OK'); process.exit(0);
