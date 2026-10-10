// nouveautes.spec.mjs — scénarios NV01 à NV10 : ce qui est arrivé avec la 8.35 (phases, créateur, étirements,
// objectifs, sources, captures, interface unique, petits liens « va dans … », lecteur), sur chaque profil d'appareil.
import { test, expect, go, synced, loaded, manual, confirm, seedRealistic, noOverflow } from './fixtures.mjs';

// Lit l'état de l'app : la fonction reçoit le module state.js (expression passée à Playwright, jamais d'eval dans la page).
const S = (p, fn, arg) => p.evaluate(`(async () => { const st = await import('/state.js'); return (${fn.toString()})(st, ${JSON.stringify(arg ?? null)}); })()`);
const cpState = (p) => S(p, (st) => ({ step: st.S.cp.step, parts: st.S.cp.parts.map((x) => x.id), ex: (st.S.cp.result?.exercises || []).map((e) => e.id) }));

test('NV01 Mes phases : créée dans le Profil, proposée dans le créateur pour son sport', async ({ page }) => {
  await go(page, 'profile/home', '#main');
  await expect(page.locator('#main [data-act=profSub][data-id=phases]'), 'Mes phases à l’accueil du Profil').toBeVisible();
  await page.click('#main [data-act=profSub][data-id=phases]'); await page.waitForSelector('[data-act=roNew]');
  await page.click('[data-act=roNew]'); await page.waitForSelector('#sheet form[data-submit=roSave]');
  await page.fill('#sheet input[name=label]', 'Spray wall audit');
  await page.locator('#sheet input[name=sports][value=climbing_boulder]').evaluate((i) => { if (!i.checked) i.closest('label').click(); });
  await page.selectOption('#sheet select[name=when]', 'end');
  await page.check('#sheet input[name=content][value=text]');
  await page.fill('#sheet textarea[name=text]', 'Invente des passages courts, un essai toutes les 2 à 3 minutes.');
  await page.locator('#sheet form[data-submit=roSave] button.pri').click();
  await expect(page.locator('#main')).toContainText('Spray wall audit');
  await synced(page);
  // Dans le créateur : la phase est proposée (« 🧩 Mes phases »), un toucher l'ajoute à la structure.
  await go(page, 'library/climbplan', '[data-act=cpQuick]');
  await page.click('[data-act=cpSport][data-id=climbing_boulder]');
  await page.click('[data-act=cpQuick]'); await page.waitForSelector('#cpresult [data-act=cpExDrop]');
  await page.click('[data-act=cpUngen]');
  const add = page.locator('[data-act=cpRoAdd][aria-label="Ajouter Spray wall audit"]'); await expect(add).toBeVisible();
  const before = (await cpState(page)).parts.length; await add.click();
  await expect.poll(async () => (await cpState(page)).parts.length).toBe(before + 1);
  expect(await S(page, (st) => st.S.cp.parts.some((x) => x.type === 'routine' && /Spray wall audit/.test(x.goal || x.label || '')))).toBe(true);
  await noOverflow(page);
});

test('NV02 Créateur : cases de l’étape 1, séance proposée, retirer après coup, retour arrière sans perte', async ({ page }) => {
  await seedRealistic(page);
  await go(page, 'library/climbplan', '[data-act=cpQuick]');
  const boxes = page.locator('input[data-change=cpChoose]'); expect(await boxes.count()).toBeGreaterThanOrEqual(5);
  for (const b of await boxes.all()) if (await b.isChecked()) await b.click();
  const total = async () => Number((await page.locator('.steps b').first().innerText()).match(/Étape \d+\/(\d+)/)[1]);
  const n0 = await total();
  await page.click('input[data-change=cpChoose][data-id=phases]'); expect(await total(), 'cocher « Les phases » montre « Ta structure »').toBe(n0 + 1);
  await page.click('input[data-change=cpChoose][data-id=phases]'); expect(await total()).toBe(n0);
  await page.click('[data-act=cpSport][data-id=climbing_boulder]');
  await page.click('[data-act=cpQuick]'); await page.waitForSelector('#cpresult [data-act=cpExDrop]');
  const a = await cpState(page); expect(a.ex.length).toBeGreaterThan(1);
  await page.locator('#cpresult [data-act=cpExDrop]').first().click();
  await expect.poll(async () => (await cpState(page)).ex.length, '✕ retire un seul exercice').toBe(a.ex.length - 1);
  const b = await cpState(page); expect(b.parts).toEqual(a.parts);
  await page.locator('#cpresult [data-act=cpPhaseDrop]').first().click(); await confirm(page);
  await expect.poll(async () => (await cpState(page)).parts.length, '« Retirer cette phase »').toBe(a.parts.length - 1);
  const c = await cpState(page);
  await page.click('[data-act=cpUngen]'); await page.click('.stepdock [data-act=cpStep][data-d="-1"]');
  await page.click('.stepdock [data-act=cpStep][data-d="1"]');
  const d = await cpState(page); expect(d.parts, 'revenir en arrière garde la structure').toEqual(c.parts);
  await noOverflow(page);
});

test('NV03 Étirements : séance adaptée, liée à la séance, programmée à la fin, lancée par son lien', async ({ page }) => {
  test.setTimeout(150000);
  const s = await manual(page, '4 × 8 tractions repos 1 min\n3 × 10 squats repos 1 min', 'Séance tirage');
  await go(page, 'library/stretch', 'select[data-change=stFor]');
  await page.selectOption('select[data-change=stFor]', s.id);
  expect((await S(page, (st) => st.S.st.zones)).length, 'zones cochées d’après les exercices').toBeGreaterThan(0);
  await page.click('[data-act=stDelay][data-id="30"]'); await page.click('[data-act=stLen][data-id="10"]');
  await page.click('[data-act=stMake]'); await page.waitForSelector('#stplan');
  expect(await page.locator('#stplan .item, #stplan li').count()).toBeGreaterThan(0);
  await noOverflow(page);
  await page.click('#stplan [data-act=stSave][data-link="1"]');
  await expect.poll(() => S(page, (st, id) => st.S.seances.items.find((x) => x.id === id)?.stretchIds?.length || 0, s.id)).toBe(1);
  const stId = await S(page, (st, id) => st.S.seances.items.find((x) => x.id === id).stretchIds[0], s.id);
  await synced(page); await page.reload(); await loaded(page);
  expect(await S(page, (st, id) => st.S.seances.items.find((x) => x.id === id).stretchIds, s.id), 'lien gardé par le serveur').toEqual([stId]);
  await go(page, 'library/seance/' + s.id, '#main');
  await expect(page.locator('#main')).toContainText('Étirements après');
  await page.locator('#main [data-act=play]').first().click(); await page.waitForSelector('#player.open');
  for (let i = 0; i < 60 && !(await page.locator('#player [data-act=pSave]').count()); i++) {
    const act = (await page.locator('#player [data-act=pRestSkip]').count()) ? 'pRestSkip' : (await page.locator('#player [data-act=pWorkDone]').count()) ? 'pWorkDone' : 'pGo';
    await page.click(`#player [data-act=${act}]`);
  }
  await expect(page.locator('#player')).toContainText('Tes étirements');
  await expect(page.locator('#player [data-act=stQuizWhen].on'), 'le délai choisi est proposé d’office').toHaveCount(1);
  await page.click('#player [data-act=pSave]');
  await expect.poll(() => S(page, (st) => st.S.events.filter((e) => e.meta?.kind === 'stretch').length)).toBe(1);
  await synced(page); await page.reload(); await loaded(page);
  expect(await S(page, (st) => st.S.events.filter((e) => e.meta?.kind === 'stretch').length), 'rendez-vous gardé par le serveur').toBe(1);
  await page.goto(page.url().split('#')[0] + '#/play/' + stId); await page.waitForSelector('#player.open');
});

test('NV04 Objectifs : « ＋ Ajouter un objectif » en deux temps, enregistré avec un résumé', async ({ page }) => {
  await seedRealistic(page);
  await go(page, 'profile/goals', '[data-act=goalNew]'); await page.click('[data-act=goalNew]');
  await page.click('#sheet [data-act=gwKind][data-id=metric]');
  expect(await page.locator('#sheet [data-act=gwMetric]').count(), 'chiffres proposés').toBeGreaterThan(0);
  await page.locator('#sheet [data-act=gwMetric]').first().click();
  await page.fill('#sheet input[data-input=gwTarget]', '15'); await page.click('#sheet [data-act=gwSet][data-k=months][data-v="3"]');
  await expect(page.locator('#sheet [data-act=gwSave]')).toBeEnabled();
  await noOverflow(page);
  const n = await S(page, (st) => st.ctx().goals.length);
  await page.click('#sheet [data-act=gwSave]');
  await expect.poll(() => S(page, (st) => st.ctx().goals.length)).toBe(n + 1);
  const g = await S(page, (st) => st.ctx().goals.at(-1));
  expect(g.type).toBe('metric'); expect(Number(g.target)).toBe(15); expect(g.deadline || '').not.toBe('');
});

test('NV05 Sources : repère « 📚 Sources » avec icônes, liste des liens, lien vers le passage exact', async ({ page }) => {
  const id = await page.evaluate(async () => { const { LIBRARY } = await import('/library.js'); return LIBRARY.find((e) => (e.caps || {}).force_doigts >= 0.5).id; });
  // Réponse du serveur simulée : le vrai passage vient de PubMed, inaccessible depuis l'environnement d'audit.
  let srcId = '';
  await page.route('**/api/sources/passages*', async (route) => {
    const ids = new URL(route.request().url()).searchParams.get('ids').split(','); srcId = ids[0];
    await route.fulfill({ json: { passages: { [ids[0]]: { url: 'https://pubmed.ncbi.nlm.nih.gov/1/#:~:text=passage%20audit', passage: 'passage audit' }, ...Object.fromEntries(ids.slice(1).map((x) => [x, null])) } } });
  });
  await go(page, 'library/exercises', '#main');
  await page.evaluate(async (x) => { const { ACT } = await import('/state.js'); ACT.libInfo({ dataset: { id: x } }); }, id);
  const badge = page.locator('#sheet.open .srcbadge').first(); await expect(badge).toBeVisible();
  expect(await badge.locator('.srcico').count(), 'icône du site').toBeGreaterThan(0);
  await badge.click(); await expect(page.locator('#sheet.open .kicker')).toContainText('Sources');
  const pass = page.locator('#sheet a', { hasText: 'Voir le passage' }).first(); await expect(pass).toBeVisible();
  expect(await pass.getAttribute('href')).toContain('#:~:text=');
  expect(srcId).not.toBe('');
  const hrefs = await page.locator('#sheet a[target=_blank]').evaluateAll((l) => l.map((a) => a.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThan(0); for (const h of hrefs) expect(h).toMatch(/^https:\/\//);
  await noOverflow(page);
});

test('NV06 Captures : jointe à un signalement, vue seulement par l’administrateur, envoyée à l’assistant', async ({ page, audit }, info) => {
  const shot = info.outputPath('capture.png'); await page.screenshot({ path: shot });
  await go(page, 'settings/bug', 'form[data-submit=bugSend]');
  await page.fill('form[data-submit=bugSend] textarea[name=description]', 'Le bouton est coupé sur mon téléphone.');
  await page.setInputFiles('form[data-submit=bugSend] input[data-change=shotPick]', shot);
  await page.waitForSelector('[data-shots=bug] .shot img');
  expect(await page.inputValue('form[data-submit=bugSend] textarea[name=description]'), 'le texte déjà écrit reste').toBe('Le bouton est coupé sur mon téléphone.');
  expect(await S(page, (st) => st.S.shots.bug[0].size)).toBeLessThanOrEqual(480000);
  await page.click('form[data-submit=bugSend] button[type=submit]');
  const admin = await audit.admin('CapAdmin');
  await expect.poll(async () => (await admin.get('/api/admin/bugs')).data.reports?.[0]?.images?.length || 0).toBe(1);
  const imgId = (await admin.get('/api/admin/bugs')).data.reports[0].images[0];
  const img = await admin.get('/api/admin/attachments/' + imgId); expect(img.status).toBe(200); expect(img.res.headers.get('Content-Type')).toBe('image/jpeg');
  expect((await audit.users.AuditBob.get('/api/admin/attachments/' + imgId)).status, 'un membre ne voit pas la capture').toBeGreaterThanOrEqual(403);
  await audit.loginAs('CapAdmin', '#/settings/bugs'); await page.waitForSelector('#bugres .shot img');
  await noOverflow(page);
  await page.click('#bugres [data-act=shotAsk]'); await page.waitForSelector('form[data-submit=asSend]');
  expect(await page.inputValue('form[data-submit=asSend] textarea[name=t]')).toContain('capture');
});

test('NV07 Une seule interface : aucun choix, un ancien réglage « avancée » est sans effet', async ({ page }) => {
  await go(page, 'settings/main', '#main');
  await expect(page.locator('html')).toHaveAttribute('data-interface', 'simple');
  expect(await page.locator('[data-act=interfaceSet]').count()).toBe(0);
  await S(page, (st) => { st.S.settings.interfaceMode = 'advanced'; st.saveSettings(); st.render(); });
  await synced(page); await page.reload(); await loaded(page);
  await expect(page.locator('html')).toHaveAttribute('data-interface', 'simple');
});

test('NV08 Petits messages « va dans … » : le chemin mène à la page, « ‹ Retour » ramène', async ({ page }) => {
  await go(page, 'library/exercises', '#main [data-act=pathGo]');
  const link = page.locator('#main [data-act=pathGo]').first(), to = await link.getAttribute('data-to');
  await link.click();
  await expect.poll(() => page.evaluate(() => location.hash)).toContain(to.split('/')[0]);
  const back = page.locator('[data-act=navBack]'); await expect(back).toBeVisible();
  await back.click(); await expect.poll(() => page.evaluate(() => location.hash)).toContain('library/exercises');
});

test('NV09 Lecteur : en bas, le prochain exercice et son nombre de séries, même pendant l’effort', async ({ page }) => {
  const s = await manual(page, '3 × 8 tractions repos 1 min\n4 × 10 pompes repos 1 min', 'Séance lecteur');
  await go(page, 'library/seance/' + s.id, '#main [data-act=play]'); await page.locator('#main [data-act=play]').first().click();
  await page.waitForSelector('#player.open .pnext');
  // L'exercice suivant de la séance jouée (un échauffement peut avoir été ajouté devant) et son nombre de séries.
  const nx = await S(page, (st) => { const p = st.S.player, e = p.s.exercises[p.i + 1]; return e ? { name: e.name, sets: e.sets } : null; });
  expect(nx).not.toBeNull();
  await expect(page.locator('#player .pnext')).toContainText(`Ensuite :`);
  await expect(page.locator('#player .pnext')).toContainText(nx.name);
  await expect(page.locator('#player .pnext')).toContainText(`${nx.sets} série`);
  if (await page.locator('#player [data-act=pGo]').count()) await page.click('#player [data-act=pGo]');
  await expect(page.locator('#player .pnext'), 'visible pendant l’effort').toBeVisible();
  await noOverflow(page);
});

test('NV10 Créateur : un choix fait à la main reste modifiable (sport, lieu, objectifs de la phase)', async ({ page }) => {
  await seedRealistic(page);
  await go(page, 'library/climbplan', '[data-act=cpQuick]');
  for (const k of ['phases']) { const b = page.locator(`input[data-change=cpChoose][data-id=${k}]`); if (!(await b.isChecked())) await b.click(); }
  await page.click('[data-act=cpSport][data-id=climbing_boulder]');
  await page.evaluate(async () => { const st = await import('/state.js'); st.S.cp.step = 3; st.render(); });
  await page.locator('[data-act=cpEdit]').last().click(); await page.waitForSelector('#sheet.open select[data-change=cpPhAct]');
  await page.selectOption('#sheet select[data-change=cpPhAct]', 'climbing_route');
  const sel = page.locator('#sheet select[data-change=cpPhAct]'); await expect(sel, 'encore modifiable après un choix').toBeEnabled();
  await expect(page.locator('#sheet')).toContainText('modifié par toi');
  await page.selectOption('#sheet select[data-change=cpPhAct]', 'climbing_boulder');
  expect(await S(page, (st) => st.S.cp.parts.at(-1).activity)).toBe('climbing_boulder');
});
