// Layout del panel (ruta protegida). El middleware ya valida la
// sesión; esta comprobación es defensa en profundidad.
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AdminShell from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/admin/login');
  if (session.mcp) redirect('/admin/cambiar-password');

  return <AdminShell username={session.username}>{children}</AdminShell>;
}
