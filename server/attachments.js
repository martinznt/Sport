// server/attachments.js — 8.35 : captures d'écran jointes à un signalement, une proposition ou une demande à
// l'assistant d'administration. Seules des images JPEG, PNG ou WebP sont acceptées, vérifiées par leurs premiers
// octets (jamais d'après le type annoncé), 2 au plus, 500 Ko chacune. Lisibles seulement par les administrateurs qui
// ont le rôle de la rubrique (signalements : technique ; propositions : contenu), servies comme images, sans script.

export const MAX_IMAGES = 2;
export const MAX_IMAGE_BYTES = 500_000; // deux captures tiennent dans une requête (1,5 Mo au plus)
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
const KINDS = ['bug', 'proposal'];

/** Type réel d'après la signature du fichier (null si ce n'est pas une image acceptée). */
export function sniff(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return 'image/png';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}
const decode = (s) => { const bin = atob(s), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };

/**
 * Valide les images envoyées ({ data: base64 sans en-tête, ou « data:image/…;base64,… » }).
 * Renvoie { images: [{ mime, data, size }] } ou { error } : une image refusée n'est jamais ignorée en silence.
 */
export function cleanImages(list) {
  if (list == null) return { images: [] };
  if (!Array.isArray(list)) return { error: 'Capture d’écran illisible.' };
  if (list.length > MAX_IMAGES) return { error: `${MAX_IMAGES} captures d’écran au plus.` };
  const images = [];
  for (const x of list) {
    let data = typeof x === 'string' ? x : typeof x?.data === 'string' ? x.data : '';
    data = data.replace(/^data:image\/(?:jpeg|png|webp);base64,/, '').replace(/\s+/g, '');
    if (!data || data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 4 || !B64.test(data)) return { error: 'Capture d’écran trop lourde ou illisible (500 Ko au plus).' };
    let bytes; try { bytes = decode(data); } catch { return { error: 'Capture d’écran illisible.' }; }
    const mime = sniff(bytes);
    if (!mime) return { error: 'Seules les images JPEG, PNG ou WebP sont acceptées.' };
    if (bytes.length > MAX_IMAGE_BYTES) return { error: 'Capture d’écran trop lourde (500 Ko au plus).' };
    images.push({ mime, data, size: bytes.length });
  }
  return { images };
}

/** Requêtes d'enregistrement (à passer dans le même lot que le signalement ou la proposition). */
export function attachStmts(env, { userId, kind, refId, images, uid }) {
  if (!KINDS.includes(kind)) throw new Error('type de pièce jointe inconnu');
  const now = Date.now();
  return images.map((im, i) => env.DB.prepare('INSERT INTO attachments(id,user_id,kind,ref_id,mime,data_b64,size,position,created_at) VALUES(?,?,?,?,?,?,?,?,?)')
    .bind(uid(), userId, kind, refId, im.mime, im.data, im.size, i, now));
}

/** Identifiants des captures de plusieurs éléments : { refId: [id, …] }. */
export async function attachmentIds(env, kind, refIds) {
  const out = {}; if (!refIds.length) return out;
  for (let i = 0; i < refIds.length; i += 90) {
    const part = refIds.slice(i, i + 90);
    const r = await env.DB.prepare(`SELECT id,ref_id FROM attachments WHERE kind=? AND ref_id IN (${part.map(() => '?').join(',')}) ORDER BY position`).bind(kind, ...part).all();
    for (const x of r.results || []) (out[x.ref_id] ||= []).push(x.id);
  }
  return out;
}

/** Une capture, pour un administrateur qui a le rôle de sa rubrique. `can(role)` est vérifié ici, côté serveur. */
export async function readAttachment(env, id, can) {
  if (!/^[\w-]{1,64}$/.test(String(id || ''))) return null;
  const a = await env.DB.prepare('SELECT id,kind,mime,data_b64 FROM attachments WHERE id=?').bind(id).first();
  if (!a || !can(a.kind === 'bug' ? 'technical' : 'content')) return null;
  return { mime: a.mime, bytes: decode(a.data_b64), kind: a.kind };
}

/** Réponse image : jamais interprétée comme une page (pas de script, pas de type deviné, pas mise en cache publique). */
export function imageResponse(a) {
  return new Response(a.bytes, { headers: { 'Content-Type': a.mime, 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Cache-Control': 'private, max-age=600' } });
}
