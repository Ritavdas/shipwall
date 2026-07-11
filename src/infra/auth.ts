import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { env } from "@/infra/env";

/**
 * GitHub sign-in is limited to identity and email. Public repository enrichment
 * can reuse the token for GitHub API rate limits without requesting repo access.
 * JWT strategy means no database adapter is needed to boot.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: env.AUTH_SECRET,
  providers: [
    GitHub({
      clientId: env.AUTH_GITHUB_ID ?? "",
      clientSecret: env.AUTH_GITHUB_SECRET ?? "",
      authorization: { params: { scope: "read:user user:email" } },
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
