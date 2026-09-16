// GET /api/uploads/<archivo> — sirve las imágenes subidas al panel
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  const uploadDir = process.env.UPLOAD_DIR || 'data/uploads';
  const root = path.resolve(process.cwd(), uploadDir);
  const rel = (params.path ?? []).join('/');
  const target = path.resolve(root, rel);
  if (!target.startsWith(root + path.sep)) {
    return new Response('No permitido', { status: 403 });
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return new Response('No encontrado', { status: 404 });
  }
  const ext = path.extname(target).toLowerCase();
  const mime = MIME[ext] ?? 'application/octet-stream';
  const data = new Uint8Array(fs.readFileSync(target));
  return new Response(data, {
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
