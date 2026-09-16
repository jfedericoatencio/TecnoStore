// POST /api/admin/upload — subida de imágenes (celular o computadora)
// En producción se guarda en Supabase Storage (persistente); en desarrollo local en UPLOAD_DIR.
import path from 'path';
import crypto from 'crypto';
import { requireAdmin } from '@/lib/auth';
import { uploadFile } from '@/lib/storage';

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

  const mime =
    file.type ||
    (ext === '.png'
      ? 'image/png'
      : ext === '.webp'
        ? 'image/webp'
        : ext === '.gif'
          ? 'image/gif'
          : 'image/jpeg');

  const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadFile(buffer, name, mime);
    return Response.json({ ok: true, url });
  } catch (err: any) {
    console.error('Error procesando upload:', err);
    return Response.json(
      { error: err?.message || 'Error al procesar la imagen' },
      { status: 500 }
    );
  }
}
