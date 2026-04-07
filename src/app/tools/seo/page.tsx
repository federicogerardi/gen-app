import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function SeoToolPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  redirect('/tools/funnel-pages');
}
