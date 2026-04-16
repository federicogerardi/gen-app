import { redirect } from 'next/navigation';
import { Fraunces, IBM_Plex_Sans } from 'next/font/google';
import { auth, signIn } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-login-display',
  weight: ['500', '600', '700'],
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-login-body',
  weight: ['400', '500', '600'],
});

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) redirect('/dashboard');

  return (
    <main
      className={`${fraunces.variable} ${ibmPlexSans.variable} relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_15%,rgba(245,208,116,0.28),transparent_36%),radial-gradient(circle_at_90%_5%,rgba(129,140,248,0.20),transparent_32%),linear-gradient(140deg,#f7f4ee_0%,#fffdf8_44%,#f4f1e9_100%)] px-4 py-10`}
      id="main-content"
    >
      <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:38px_38px]" />

      <section className="relative mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-[0_25px_90px_-40px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:p-10">
          <p className="mb-4 inline-flex rounded-full border border-amber-400/40 bg-amber-100/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
            Workspace creativo per team marketing
          </p>

          <h1
            className="max-w-2xl text-balance text-4xl leading-[1.05] text-slate-900 sm:text-5xl"
            style={{ fontFamily: 'var(--font-login-display)' }}
          >
            Scrivi meno prompt.
            <br />
            Ottieni campagne migliori.
          </h1>

          <p
            className="mt-6 max-w-xl text-base leading-relaxed text-slate-700 sm:text-lg"
            style={{ fontFamily: 'var(--font-login-body)' }}
          >
            Gen App aiuta il tuo team a produrre Funnel Pages pronte all&apos;uso, mantenendo coerenza di tono,
            velocita di iterazione e controllo sui costi.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3" style={{ fontFamily: 'var(--font-login-body)' }}>
            <div className="rounded-2xl border border-slate-900/10 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Focus</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Funnel Pages</p>
            </div>
            <div className="rounded-2xl border border-slate-900/10 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Workflow</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Streaming in tempo reale</p>
            </div>
            <div className="rounded-2xl border border-slate-900/10 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Controllo</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Quota e budget per utente</p>
            </div>
          </div>
        </article>

        <Card className="w-full rounded-3xl border-black/10 bg-white/85 py-0 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur-sm">
          <CardHeader className="space-y-2 border-b border-black/10 px-6 py-6 sm:px-8">
            <CardTitle className="text-2xl text-slate-900" style={{ fontFamily: 'var(--font-login-display)' }}>
              Benvenuto in Gen App
            </CardTitle>
            <CardDescription className="text-sm text-slate-600" style={{ fontFamily: 'var(--font-login-body)' }}>
              Accedi con il tuo account Google aziendale e riprendi subito il lavoro.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 px-6 py-6 sm:px-8 sm:py-8" style={{ fontFamily: 'var(--font-login-body)' }}>
            <form action={async () => { 'use server'; await signIn('google', { redirectTo: '/dashboard' }); }}>
              <Button className="h-11 w-full text-sm font-semibold" type="submit">
                Accedi con Google
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
