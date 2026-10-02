import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publication = JSON.parse(fs.readFileSync(path.join(root, 'data/publication.json')));
const provenancePath = path.join(root, 'data/cover-provenance.json');
const previous = new Map(JSON.parse(fs.readFileSync(provenancePath)).map(v => [v.id, v]));
const directory = path.join(root, 'dist/assets/thumbnails');
fs.mkdirSync(directory, { recursive: true });

// Reject HTML error pages and YouTube's tiny missing-image placeholder.
function dimensions(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Not a JPEG');
  for (let i = 2; i + 8 < bytes.length;) {
    if (bytes[i++] !== 0xff) throw new Error('Invalid JPEG marker');
    while (bytes[i] === 0xff) i++;
    const marker = bytes[i++];
    if (marker === 0xd9 || marker === 0xda) break;
    const length = bytes.readUInt16BE(i);
    if (length < 2 || i + length > bytes.length) throw new Error('Invalid JPEG segment');
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: bytes.readUInt16BE(i + 5), height: bytes.readUInt16BE(i + 3) };
    }
    i += length;
  }
  throw new Error('JPEG dimensions unavailable');
}

const results = [];
for (let start = 0; start < publication.videos.length; start += 4) {
  const batch = await Promise.all(publication.videos.slice(start, start + 4).map(async video => {
    if (!/^[\w-]{11}$/.test(video.id)) throw new Error('Invalid video ID');
    const file = path.join(directory, video.id + '.jpg');
    const old = previous.get(video.id);
    const savedRecord = old && { ...old, title:video.originalTitle, format:video.format };
    const verifiedSaved = old?.kind === 'YouTube video thumbnail' && fs.existsSync(file) &&
      createHash('sha256').update(fs.readFileSync(file)).digest('hex') === old.sha256;
    if (verifiedSaved && !process.argv.includes('--refresh')) return savedRecord;
    for (const quality of ['maxresdefault', 'hqdefault']) {
      const source = `https://img.youtube.com/vi/${video.id}/${quality}.jpg`;
      try {
        const response = await fetch(source, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) continue;
        const bytes = Buffer.from(await response.arrayBuffer());
        const size = dimensions(bytes);
        if (size.width < 320 || bytes.length < 1000) continue;
        fs.writeFileSync(file, bytes);
        return { id: video.id, kind: 'YouTube video thumbnail', source, title: video.originalTitle,
          format: video.format, ...size, sha256: createHash('sha256').update(bytes).digest('hex') };
      } catch { /* Keep a verified saved thumbnail when the upstream is unavailable. */ }
    }
    if (verifiedSaved) return savedRecord;
    // Build uses this video's remote thumbnail until a download succeeds.
    return { id: video.id, kind: 'YouTube remote thumbnail', source: `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`, title:video.originalTitle, format:video.format };
  }));
  results.push(...batch);
}
fs.writeFileSync(provenancePath, JSON.stringify(results, null, 2) + '\n');
console.log(`Verified ${results.filter(v => v.sha256).length}/${results.length} saved video thumbnails.`);
