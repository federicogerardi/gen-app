import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function SeoToolPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  return (
    <>
      <Navbar />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Tool SEO</CardTitle>
            <CardDescription>
              Produci output orientati a keyword, intent e performance organica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
              <li>Prompt e parametri per meta title, meta description e struttura contenuto</li>
              <li>Workflow pensato per SEO Specialist e content strategist</li>
              <li>Output modificabile e tracciabile nel progetto</li>
            </ul>
            <Button asChild>
              <Link href="/artifacts/new?type=seo">Apri generatore SEO</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
