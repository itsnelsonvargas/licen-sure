import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import api from "@/lib/api";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          // First, get a CSRF cookie from the Laravel backend
          await api.get("/sanctum/csrf-cookie");

          // Then, attempt to log in
          const response = await api.post("/login", {
            email: credentials?.email,
            password: credentials?.password,
          });

          // The user data should be returned on successful login
          // We assume the Laravel backend returns the user object
          if (response.data) {
            return response.data;
          } else {
            return null;
          }
        } catch (error: any) {
          // Handle login errors (e.g., invalid credentials)
          // The error response from Laravel should be passed to the client
          throw new Error(error.response?.data?.message || "Login failed");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Persist the user object to the token
      if (user) {
        token.user = user;
      }
      return token;
    },
    async session({ session, token }) {
      // Persist the user object to the session
      session.user = token.user as any;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export { handler as GET, handler as POST };
