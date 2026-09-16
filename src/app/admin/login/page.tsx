// Login del panel — página pública. Si ya hay sesión, redirige.
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import LoginForm from '@/components/admin/LoginForm';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.mcp ? '/admin/cambiar-password' : '/admin');
  }
  return <LoginForm />;
}
