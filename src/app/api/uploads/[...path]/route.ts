// GET /api/uploads/<archivo> — sirve las imágenes subidas al panel
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { getPublicUrl, isSupabaseStorageEnabled } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  const rel = (params.path ?? []).join('/');

  // 1. Si existe en el disco local (desarrollo o migraciones anteriores), servirlo
  const uploadDir = process.env.UPLOAD_DIR || 'data/uploads';
  const root = path.resolve(process.cwd(), uploadDir);
  const target = path.resolve(root, rel);
  if (target.startsWith(root + path.sep) && fs.existsSync(target) && fs.statSync(target).isFile()) {
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

  // 2. Si Supabase Storage está configurado, redirigir a la URL pública de Supabase
  if (isSupabaseStorageEnabled()) {
    const pubUrl = getPublicUrl(rel);
    return NextResponse.redirect(pubUrl, { status: 302 });
  }

  return new Response('No encontrado', { status: 404 });
}
