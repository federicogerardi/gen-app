import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function CodeToolPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  return (
    <>
      <Navbar />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Tool Code</CardTitle>
            <CardDescription>
              Genera snippet, template e blocchi tecnici per automazioni e landing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
              <li>Input guidato per framework, linguaggio e vincoli tecnici</li>
              <li>Utile per use case marketing tecnico e integrazioni rapide</li>
              <li>Output pronto da adattare e salvare nel progetto</li>
            </ul>
            <Button asChild>
              <Link href="/artifacts/new?type=code">Apri generatore Code</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
