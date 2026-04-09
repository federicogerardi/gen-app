import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import * as Sentry from '@sentry/nextjs';
import { Providers } from '@/components/layout/Providers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export function generateMetadata(): Metadata {
  return {
    title: 'Gen App',
    description: 'LLM Artifact Generation Hub',
    other: {
      ...Sentry.getTraceData(),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif' }}
    >
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        style={{ fontFamily: 'inherit' }}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg"
        >
          Salta al contenuto principale
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
