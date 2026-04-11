import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import type { Adapter } from 'next-auth/adapters';
import type { Role } from '@/generated/prisma';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

const allowedEmailDomains = env.ALLOWED_EMAIL_DOMAINS
  .split(',')
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: 'database' },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const googleProfile = profile as { email_verified?: boolean } | undefined;
        const emailDomain = user.email?.split('@')[1]?.toLowerCase();

        return (
          googleProfile?.email_verified === true &&
          !!emailDomain &&
          allowedEmailDomains.includes(emailDomain)
        );
      }
      return false;
    },
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.role = (user as { role?: Role }).role ?? 'user';
      return session;
    },
  },
  trustHost: true,
});
