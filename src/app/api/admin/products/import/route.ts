// POST /api/admin/products/import
// Paso 1: recibe el .xlsx/.csv (+ ZIP opcional de imágenes), lo
// parsea del lado del servidor y devuelve la vista previa con
// errores y advertencias por fila.
import path from 'path';
import AdmZip from 'adm-zip';
import * as XLSX from 'xlsx';
import { qAll } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { uploadFile } from '@/lib/storage';
import {
  buildImportRow,
  mapHeader,
  type ImportRow,
} from '@/lib/import';

export const dynamic = 'force-dynamic';

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;

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
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: 'Subí un archivo .xlsx o .csv' }, { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) {
    return Response.json({ error: 'El archivo supera los 15 MB' }, { status: 400 });
  }

  // ---- ZIP opcional de imágenes ----
  const imageUrlMap = new Map<string, string>(); // basename lower → url pública
  const zip = form.get('zip');
  if (zip instanceof File && zip.size > 0) {
    try {
      const adm = new AdmZip(Buffer.from(await zip.arrayBuffer()));
      let count = 0;
      for (const entry of adm.getEntries()) {
        const base = path.basename(entry.entryName);
        if (entry.isDirectory || base.startsWith('.') || base.startsWith('__MACOSX')) continue;
        if (!IMAGE_EXT.test(base)) continue;
        const origExt = path.extname(base).toLowerCase();
        const mime =
          origExt === '.png'
            ? 'image/png'
            : origExt === '.webp'
              ? 'image/webp'
              : origExt === '.gif'
                ? 'image/gif'
                : 'image/jpeg';
        const safeName = `${Date.now()}-${count}-${base.toLowerCase().replace(/[^a-z0-9._-]/g, '_')}`;
        const url = await uploadFile(entry.getData(), safeName, mime);
        imageUrlMap.set(base.toLowerCase(), url);
        count++;
      }
      if (count === 0) {
        return Response.json(
          { error: 'El ZIP no contiene imágenes (jpg, png, webp, gif)' },
          { status: 400 }
        );
      }
    } catch {
      return Response.json({ error: 'El ZIP está corrupto o no pudo leerse' }, { status: 400 });
    }
  }

  // ---- Parseo del Excel/CSV ----
  let rows: RawRowLike[];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer', raw: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) return Response.json({ error: 'El archivo no tiene hojas' }, { status: 400 });
    rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
  } catch {
    return Response.json(
      { error: 'No se pudo leer el archivo. ¿Es un .xlsx o .csv válido?' },
      { status: 400 }
    );
  }

  rows = rows.filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''));
  if (rows.length === 0) {
    return Response.json(
      { error: 'El archivo no contiene filas de datos. Revisá que la primera fila tenga los encabezados.' },
      { status: 400 }
    );
  }

  // Encabezados reconocidos
  const firstKeys = Object.keys(rows[0] ?? {});
  const recognized = firstKeys.filter((k) => mapHeader(k) !== null);
  if (recognized.length === 0) {
    return Response.json(
      {
        error:
          'No se reconocieron columnas. Descargá la plantilla y usá los encabezados: nombre, precio, categoria, etc.',
      },
      { status: 400 }
    );
  }

  const cats = await qAll<{ id: number; name: string }>('SELECT id, name FROM categories');
  const existingCats = new Map(cats.map((c) => [c.name.toLowerCase(), c.name]));
  const newCategories = new Set<string>();

  const valid: ImportRow[] = [];
  const invalid: ImportRow[] = [];

  rows.forEach((raw, i) => {
    const row = buildImportRow(raw as Record<string, unknown>, i + 2, existingCats);

    // Resolver imagen local del ZIP
    if (row.url_imagen && !/^https?:\/\//i.test(row.url_imagen) && !row.url_imagen.startsWith('/')) {
      const base = path.basename(row.url_imagen).toLowerCase();
      const found = imageUrlMap.get(base);
      if (found) {
        row.url_imagen = found;
      } else {
        const loose = [...imageUrlMap.entries()].find(([k]) => k.includes(base.split('.')[0]));
        if (loose) row.url_imagen = loose[1];
        else row.warnings.push('Imagen no encontrada en el ZIP');
      }
    }

    for (const w of row.warnings) {
      if (w.startsWith('Categoría')) {
        const m = w.match(/Categoría "(.+)" no existe/);
        if (m) newCategories.add(m[1]);
      }
    }

    if (row.errors.length === 0) valid.push(row);
    else invalid.push(row);
  });

  return Response.json({
    ok: true,
    fileName: file.name,
    zipImages: imageUrlMap.size,
    total: valid.length + invalid.length,
    valid,
    invalid,
    newCategories: [...newCategories],
  });
}

type RawRowLike = Record<string, unknown>;
