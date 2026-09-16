'use client';
// Formulario de cambio de contraseña (reutilizado por el cambio
// obligatorio del primer ingreso y por Configuración).
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { toast } from '@/components/Toaster';
import { LockIcon } from '@/components/icons';
import { Spinner } from './ui';

export default function PasswordForm({
  forced = false,
  onDone,
}: {
  forced?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (next !== repeat) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await api('/api/admin/password', {
        method: 'POST',
        json: { current, next },
      });
      toast('Contraseña actualizada correctamente', 'success');
      if (forced) {
        router.replace('/admin');
        router.refresh();
      } else {
        onDone?.();
      }
    } catch (err: any) {
      setError(err?.message || 'No se pudo cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">
          ⚠ {error}
        </p>
      )}
      <div>
        <label className="label" htmlFor="p-current">Contraseña actual</label>
        <input
          id="p-current"
          type="password"
          className="input"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="p-next">Nueva contraseña</label>
        <input
          id="p-next"
          type="password"
          className="input"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="mt-1 text-xs text-slate-400">Mínimo 8 caracteres.</p>
      </div>
      <div>
        <label className="label" htmlFor="p-repeat">Repetir nueva contraseña</label>
        <input
          id="p-repeat"
          type="password"
          className="input"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? <Spinner className="border-white/40 border-t-white" /> : (
          <>
            <LockIcon className="h-4 w-4" /> CAMBIAR CONTRASEÑA
          </>
        )}
      </button>
    </form>
  );
}
