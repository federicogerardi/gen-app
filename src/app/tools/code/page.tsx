import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function CodeToolPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  redirect('/tools/meta-ads');
}
