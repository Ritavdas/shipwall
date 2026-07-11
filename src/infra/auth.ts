import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { env } from "@/infra/env";

/**
 * GitHub sign-in isn't just identity — it's authorization. We request `repo`
 * scope so we can read the builder's OWN private repos (languages + README)
 * server-side with their token. JWT strategy => no DB adapter needed to boot.
 *
 * v2 note: swap this OAuth scope for a fine-grained GitHub App (per-repo grant)
 * to lower the trust cost. Kept as classic OAuth for MVP speed.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: env.AUTH_SECRET,
  providers: [
    GitHub({
      clientId: env.AUTH_GITHUB_ID ?? "",
      clientSecret: env.AUTH_GITHUB_SECRET ?? "",
      authorization: { params: { scope: "read:user user:email repo" } },
    }),
  ],
  callbacks: {
    jwt({ token, account, profile }) {
      if (account?.access_token) token.accessToken = account.access_token;
      if (profile) {
        const p = profile as {
          id?: number | string;
          login?: string;
          avatar_url?: string;
          name?: string;
        };
        if (p.id != null) token.githubId = String(p.id);
        if (p.login) token.login = p.login;
        if (p.avatar_url) token.avatarUrl = p.avatar_url;
        if (p.name) token.displayName = p.name;
      }
      return token;
    },
    session({ session, token }) {
      session.accessToken = token.accessToken;
      session.githubId = token.githubId;
      session.login = token.login;
      session.avatarUrl = token.avatarUrl;
      session.displayName = token.displayName;
      return session;
    },
  },
});
