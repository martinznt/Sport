// tests/gohint.test.mjs — 8.35 : chaque petit message « … va dans Profil › Mes lieux » emmène là où il le dit.
// Le texte du chemin (« Profil › Mes lieux ») et l'adresse du lien (« profile/equipment ») sont comparés aux vrais
// libellés des pages (tuiles du profil, rubriques de la bibliothèque et des progrès, menu des paramètres).
import assert from 'node:assert/strict';
import fs from 'node:fs';
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('  ✓', name); };
const DIR = new URL('../public/', import.meta.url), read = (f) => fs.readFileSync(new URL(f, DIR), 'utf8');
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.js')).map((f) => [f, read(f)]);
const block = (src, start, end) => { const a = src.indexOf(start); assert.ok(a >= 0, start); return src.slice(a, src.indexOf(end, a)); };
const pairs = (b, re) => Object.fromEntries([...b.matchAll(re)].map((m) => [m[2], m[1]]));
const PAGES = {
  Profil: ['profile', pairs(block(read('views-profile.js'), 'const TILES = {', '};'), /(\w+): \['[^']*', '([^']+)'/g)],
  Bibliothèque: ['library', pairs(block(read('views-library.js'), 'const LIB_INFO = {', '};'), /(\w+): \['[^']*', '([^']+)'/g)],
  Progrès: ['progress', pairs(block(read('views-progress.js'), 'const SUB_INFO = {', '};'), /(\w+): \['[^']*', '([^']+)'/g)],
  Paramètres: ['settings', pairs(block(read('views-settings.js'), 'const MENU = [', '];'), /\['(\w+)', '[^']*', '([^']+)'/g)],
};
const calls = files.flatMap(([f, src]) => [...src.matchAll(/goHint\((?:'[^']*'|`[^`]*`|"[^"]*"),\s*'([^']+)',\s*'([^']+)'\)/g)].map((m) => ({ f, path: m[1], to: m[2] })));

ok('les petits messages sont bien trouvés (sinon le test ne vérifierait rien)', () => assert.ok(calls.length >= 12, `${calls.length} messages`));
ok('chaque chemin écrit mène à la page qu’il nomme', () => {
  const bad = [];
  for (const c of calls) {
    const [section, page] = c.path.split(' › '), def = PAGES[section];
    if (!def) { bad.push(`${c.f} : rubrique inconnue « ${section} »`); continue; }
    const [tab, labels] = def, sub = labels[page];
    if (!sub) bad.push(`${c.f} : « ${c.path} » n’existe pas`);
    else if (c.to !== `${tab}/${sub}`) bad.push(`${c.f} : « ${c.path} » mène à ${c.to} au lieu de ${tab}/${sub}`);
  }
  assert.deepEqual(bad, []);
});
ok('le lien des messages ramène en arrière (« ‹ Retour ») au lieu de perdre la page d’origine', () => {
  assert.match(read('ui.js'), /export const goHint[^\n]*data-act="pathGo"/);
  assert.match(read('nav.js'), /ACT\.pathGo = [\s\S]{0,400}setReturn\(/);
});
console.log(`${n} tests OK`);
