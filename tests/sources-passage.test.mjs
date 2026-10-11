// tests/sources-passage.test.mjs — 8.35 : « 🎯 Voir le passage ». La phrase vient toujours du résumé PubMed lu (jamais
// écrite par l'app) ; un article dont le titre ne correspond pas est refusé ; le lien mène à la phrase (fragment de texte).
import assert from 'node:assert/strict';
import { abstractSentences, bestSentence, textFragment, sourcePassage } from '../server/ai-evidence.js';
import { SOURCES, siteOf, exerciseSources } from '../public/sources.js';
import { LIBRARY } from '../public/library.js';
import { makeEnv, Client } from './helpers.mjs';

let n = 0; const ok = async (name, fn) => { await fn(); n++; console.log('  ✓', name); };
const xml = (pmid, title, parts) => `<PubmedArticleSet><PubmedArticle><MedlineCitation><PMID>${pmid}</PMID><Article><ArticleTitle>${title}</ArticleTitle><Abstract>${parts.map(([l, t]) => `<AbstractText Label="${l}">${t}</AbstractText>`).join('')}</Abstract></Article></MedlineCitation></PubmedArticle></PubmedArticleSet>`;
const WHO = SOURCES.who2020;
const WHO_XML = xml('33239350', WHO.title, [['OBJECTIVES', 'To describe new guidelines on physical activity.'], ['RESULTS', 'All adults should undertake 150 to 300 minutes of moderate-intensity, or 75 to 150 minutes of vigorous-intensity physical activity, per week. Some other sentence about sedentary behaviour here.']]);

await ok('phrases du résumé : étiquettes retirées, phrases découpées', () => {
  const s = abstractSentences('RESULTS: The first finding of the trial is here. A second finding follows it closely.\nCONCLUSIONS: The method works well enough for adults. Ok.');
  assert.deepEqual(s, ['The first finding of the trial is here.', 'A second finding follows it closely.', 'The method works well enough for adults.']);
});
await ok('la phrase choisie est celle qui contient le plus de mots repères', () => {
  assert.equal(bestSentence(['Nothing relevant at all here.', 'Adults need 150 to 300 minutes of moderate activity.'], ['150', 'moderate', '300 minutes']), 'Adults need 150 to 300 minutes of moderate activity.');
  assert.equal(bestSentence(['Rien de pertinent dans cette phrase-là.'], ['150']), null);
});
await ok('fragment de texte : début et fin d’une longue phrase, tirets et virgules encodés', () => {
  const f = textFragment('All adults should undertake 150 to 300 minutes of moderate-intensity, or 75 to 150 minutes of vigorous-intensity physical activity, per week.');
  assert.match(f, /^#:~:text=All%20adults%20should%20undertake%20150%20to,/);
  assert.ok(f.includes('%2D') && !/[^%]-/.test(f.slice(9)), f);
  assert.equal(textFragment('Short claim here.'), '#:~:text=Short%20claim%20here');
});
await ok('source sur PubMed : passage recopié du résumé lu, lien vers la phrase', async () => {
  const calls = [];
  const fetcher = async (url) => { calls.push(String(url)); return new Response(WHO_XML, { status: 200 }); };
  const r = await sourcePassage('who2020', { fetcher });
  assert.equal(r.pmid, '33239350'); assert.match(r.passage, /^All adults should undertake 150 to 300 minutes/);
  assert.ok(WHO_XML.includes(r.passage.slice(0, 60)), 'la phrase vient du résumé');
  assert.match(r.url, /^https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/33239350\/#:~:text=/);
  assert.equal(calls.length, 1); assert.match(calls[0], /efetch\.fcgi\?db=pubmed&id=33239350/);
});
await ok('source hors PubMed : retrouvée par son titre, refusée si le titre ne correspond pas', async () => {
  const s = SOURCES.soligard2008;
  const good = async (url) => new Response(/esearch/.test(url) ? '<eSearchResult><IdList><Id>19066253</Id></IdList></eSearchResult>' : xml('19066253', s.title, [['RESULTS', 'The warm-up programme reduced the risk of injuries by about a third in young players.']]));
  const r = await sourcePassage('soligard2008', { fetcher: good });
  assert.equal(r.pmid, '19066253'); assert.match(r.passage, /reduced the risk of injuries/);
  const wrong = async (url) => new Response(/esearch/.test(url) ? '<IdList><Id>1</Id></IdList>' : xml('1', 'A completely different paper about knees and cycling performance outcomes', [['RESULTS', 'Warm-up reduced injury in this other study.']]));
  assert.equal(await sourcePassage('soligard2008', { fetcher: wrong }), null);
});
await ok('PubMed injoignable ou résumé sans phrase repère : null ou lien vers le résumé, jamais une phrase inventée', async () => {
  assert.equal(await sourcePassage('who2020', { fetcher: async () => { throw new Error('réseau'); } }), null);
  const r = await sourcePassage('who2020', { fetcher: async () => new Response(xml('33239350', WHO.title, [['RESULTS', 'Unrelated text without the expected keywords in it.']])) });
  assert.equal(r.passage, ''); assert.match(r.url, /#abstract$/);
});
await ok('point d’accès : passage gardé 30 jours (une seule lecture PubMed), identifiants inconnus ignorés', async () => {
  const real = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(WHO_XML); };
  try {
    const c = new Client(makeEnv());
    const a = await c.get('/api/sources/passages?ids=who2020,inconnu,../x'); assert.equal(a.status, 200);
    assert.deepEqual(Object.keys(a.data.passages), ['who2020']); assert.match(a.data.passages.who2020.url, /#:~:text=/);
    const b = await c.get('/api/sources/passages?ids=who2020'); assert.equal(b.data.passages.who2020.url, a.data.passages.who2020.url);
    assert.equal(calls, 1, 'servi depuis la mémoire du serveur');
  } finally { globalThis.fetch = real; }
});
await ok('chaque source a une icône de site ; aucun lien d’image externe', () => {
  for (const [id, s] of Object.entries(SOURCES)) { const [name, abbr, color] = siteOf(s); assert.ok(name && abbr && /^#[0-9a-f]{3,6}$/i.test(color), id); }
  assert.equal(siteOf(SOURCES.who2020)[0], 'PubMed'); assert.equal(siteOf(SOURCES.soligard2008)[0], 'BMJ');
});
await ok('exercices : chaque ligne de source dit ce qu’elle appuie, et ne cite que des sources existantes', () => {
  let withSrc = 0;
  for (const e of LIBRARY) for (const row of exerciseSources(e)) { withSrc++; assert.ok(row.claim.length > 10); for (const id of row.ids) assert.ok(SOURCES[id], id); }
  assert.ok(withSrc > 150, `${withSrc} lignes`);
  const finger = LIBRARY.find((e) => (e.caps || {}).force_doigts >= 0.5);
  assert.ok(exerciseSources(finger).some((r) => r.ids.includes('schoffl2006')));
});
console.log(`${n} tests OK`);
