import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function ContentToolPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  return (
    <>
      <Navbar />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Tool Content</CardTitle>
            <CardDescription>
              Genera copy per ads, landing page e contenuti marketing con parametri guidati.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
              <li>Focus su tono, audience e obiettivo di campagna</li>
              <li>Output pronto per iterazioni rapide con il team media</li>
              <li>Streaming in tempo reale e salvataggio automatico</li>
            </ul>
            <Button asChild>
              <Link href="/artifacts/new?type=content">Apri generatore Content</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
