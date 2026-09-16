'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/client';
import { toast } from '@/components/Toaster';
import { TruckIcon, LockIcon } from '@/components/icons';
import { Spinner } from './ui';

export default function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const expired = search.get('expirada') === '1';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api<{ ok: boolean; mustChangePassword: boolean }>('/api/admin/login', {
        method: 'POST',
        json: { username, password },
      });
      if (res.mustChangePassword) {
        router.replace('/admin/cambiar-password');
      } else {
        const from = search.get('from');
        router.replace(from && from.startsWith('/admin') ? from : '/admin');
      }
    } catch (err: any) {
      setError(err?.message || 'No se pudo iniciar sesión');
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 text-brand-950 shadow-lg">
            <TruckIcon className="h-9 w-9" />
          </span>
          <h1 className="mt-3 text-xl font-extrabold tracking-wide text-white">DISTRIBUIDORA CENTRAL</h1>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-brand-300">
            <LockIcon className="h-4 w-4" /> Panel de administración
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-3xl bg-white p-6 shadow-2xl"
        >
          {expired && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              Tu sesión expiró. Volvé a ingresar.
            </p>
          )}
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">
              ⚠ {error}
            </p>
          )}
          <div>
            <label className="label" htmlFor="a-user">Usuario</label>
            <input
              id="a-user"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="a-pass">Contraseña</label>
            <input
              id="a-pass"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
            {loading ? <Spinner className="border-white/40 border-t-white" /> : 'INGRESAR'}
          </button>
          <p className="text-center text-[11px] leading-relaxed text-slate-400">
            Acceso restringido al dueño del negocio.
            <br />
            Las credenciales se verifican contra la base de datos (bcrypt + JWT).
          </p>
        </form>
      </div>
    </main>
  );
}
