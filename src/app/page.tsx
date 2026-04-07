import { redirect } from 'next/navigation';
import { auth, signIn } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) redirect('/dashboard');

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Gen App</CardTitle>
          <CardDescription>LLM Artifact Generation Hub</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={async () => { 'use server'; await signIn('google', { redirectTo: '/dashboard' }); }}>
            <Button className="w-full" type="submit">Accedi con Google</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
