import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { ArtifactsClientPage } from './ArtifactsClientPage';

export default async function ArtifactsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const projects = await db.project.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true },
  });

  return <ArtifactsClientPage projects={projects} />;
}