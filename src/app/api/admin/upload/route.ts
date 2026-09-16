// POST /api/admin/upload — subida de imágenes (celular o computadora)
// Se guardan en UPLOAD_DIR (persistente) y se sirven vía /api/uploads/.
// En producción con Supabase se puede reemplazar por Supabase Storage.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: 'Formulario inválido' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'No se recibió ninguna imagen' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: 'La imagen supera los 8 MB' }, { status: 400 });
  }

  const origExt = path.extname(file.name || '').toLowerCase();
  const ext = ALLOWED_EXT.includes(origExt)
    ? origExt
    : file.type === 'image/png'
      ? '.png'
      : file.type === 'image/webp'
        ? '.webp'
        : file.type === 'image/gif'
          ? '.gif'
          : file.type === 'image/jpeg' || file.type === 'image/jpg'
            ? '.jpg'
            : '';
  if (!ext) {
    return Response.json(
      { error: 'Formato no soportado. Usá JPG, PNG, WEBP o GIF.' },
      { status: 400 }
    );
  }

  const uploadDir = process.env.UPLOAD_DIR || 'data/uploads';
  const dir = path.resolve(process.cwd(), uploadDir);
  fs.mkdirSync(dir, { recursive: true });

  const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  return Response.json({ ok: true, url: `/api/uploads/${name}` });
}
