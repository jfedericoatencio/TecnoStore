// Cambio de contraseña OBLIGATORIO del primer ingreso.
// El middleware ya bloquea el resto del panel mientras el flag
// must_change_password esté activo; esta página es la única
// salida permitida.
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { TruckIcon } from '@/components/icons';
import PasswordForm from '@/components/admin/PasswordForm';

export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect('/admin/login');

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-5 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-brand-950 shadow-lg">
            <TruckIcon className="h-8 w-8" />
          </span>
          <h1 className="mt-3 text-lg font-extrabold text-white">Seguridad de tu cuenta</h1>
          <p className="mt-1 text-sm text-brand-300">
            {session.mcp
              ? 'Estás usando la contraseña inicial. Por seguridad, debés cambiarla antes de continuar.'
              : 'Podés cambiar tu contraseña cuando quieras.'}
          </p>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-2xl">
          <PasswordForm forced />
        </div>
      </div>
    </main>
  );
}
