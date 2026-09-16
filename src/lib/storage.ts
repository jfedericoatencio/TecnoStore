// ============================================================
// Almacenamiento de archivos / imágenes
// - En producción / Vercel: Supabase Storage (persistente, servido por CDN)
// - En desarrollo local / fallback: sistema de archivos local (UPLOAD_DIR)
// ============================================================
import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabaseClient: SupabaseClient | null = null;
let _bucketChecked = false;

export function getSupabaseStorageConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
  return { url, key, bucket, enabled: Boolean(url && key) };
}

export function isSupabaseStorageEnabled(): boolean {
  return getSupabaseStorageConfig().enabled;
}

function getSupabaseClient(): SupabaseClient | null {
  const { url, key, enabled } = getSupabaseStorageConfig();
  if (!enabled) return null;
  if (!_supabaseClient) {
    _supabaseClient = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return _supabaseClient;
}

export async function uploadFile(
  buffer: Buffer | Uint8Array,
  fileName: string,
  contentType: string
): Promise<string> {
  const { bucket, enabled, url } = getSupabaseStorageConfig();

  if (enabled) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        if (!_bucketChecked) {
          try {
            const { data: buckets } = await supabase.storage.listBuckets();
            const exists = buckets?.some((b) => b.name === bucket);
            if (!exists) {
              await supabase.storage.createBucket(bucket, { public: true });
            }
          } catch {
            // Si la clave no tiene permisos para listar buckets (ej. anon), continuamos con el upload
          }
          _bucketChecked = true;
        }

        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, buffer, {
            contentType,
            upsert: true,
          });

        if (error) {
          // Si falló porque no existía el bucket, intentamos crearlo y reintentar
          if (error.message?.includes('not found') || (error as any)?.statusCode === '404') {
            await supabase.storage.createBucket(bucket, { public: true });
            const retry = await supabase.storage.from(bucket).upload(fileName, buffer, {
              contentType,
              upsert: true,
            });
            if (retry.error) throw retry.error;
          } else {
            throw error;
          }
        }

        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(fileName);
        if (pub?.publicUrl) return pub.publicUrl;
      } catch (err) {
        console.error('Error subiendo imagen a Supabase Storage:', err);
        // Si falla en producción sin acceso a disco, relanzamos el error
        if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
          throw new Error(
            'Error al guardar la imagen en Supabase Storage. Verificá permisos del bucket o usá SUPABASE_SERVICE_ROLE_KEY.'
          );
        }
      }
    }
  }

  // Fallback: almacenamiento en disco local (desarrollo local)
  const uploadDir = process.env.UPLOAD_DIR || 'data/uploads';
  const dir = path.resolve(process.cwd(), uploadDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, fileName), Buffer.from(buffer));
  return `/api/uploads/${fileName}`;
}

export function getPublicUrl(fileName: string): string {
  const { bucket, enabled, url } = getSupabaseStorageConfig();
  if (enabled && url) {
    return `${url.replace(/\/+$/, '')}/storage/v1/object/public/${bucket}/${fileName}`;
  }
  return `/api/uploads/${fileName}`;
}
