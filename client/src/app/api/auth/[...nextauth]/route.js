import jwt from 'jsonwebtoken';
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          await connectToDatabase();
          const user = await User.findOne({ username: credentials.username });
          
          if (!user) {
            throw new Error('No user found with this username');
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);
          
          if (!isValid) {
            throw new Error('Invalid password');
          }

          return {
            id: user._id.toString(),
            username: user.username,
            name: user.name,
            shopId: user._id.toString()
          };
        } catch (error) {
          console.error('Auth error:', error);
          throw error;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.name = user.name;
        token.shopId = user.shopId || user.id;
      }
      
      // Always generate a fresh access token for API calls
      // This ensures the token is always valid (not expired)
      if (process.env.NEXTAUTH_SECRET && token.id) {
        token.accessToken = jwt.sign(
          { id: token.id, username: token.username, shopId: token.shopId || token.id },
          process.env.NEXTAUTH_SECRET,
          { expiresIn: '24h' } // Longer expiry to reduce overhead
        );
      }
     
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = session.user || {};
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.name = token.name;
        session.user.shopId = token.shopId || token.id;
        if (token.accessToken) {
          session.apiToken = token.accessToken;
        }
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development'
});

export { handler as GET, handler as POST };