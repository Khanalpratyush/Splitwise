import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { User } from "@/models/User";
import connectDB from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email });
        if (!user) {
          throw new Error('User not found');
        }

        const isValid = await user.comparePassword(credentials.password);
        if (!isValid) {
          throw new Error('Invalid password');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    session: async ({ session, token }) => {
      if (session?.user) {
        await connectDB();
        const user = await User.findById(token.sub).select('name email');
        if (user) {
          session.user.id = token.sub;
          session.user.name = user.name;
          session.user.email = user.email;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  }
}; 