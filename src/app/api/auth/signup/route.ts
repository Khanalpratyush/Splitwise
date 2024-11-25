import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { User } from '@/models/User';
import connectDB from '@/lib/mongodb';
import logger from '@/utils/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { message: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    return NextResponse.json(
      { 
        success: true,
        message: 'Account created successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Signup error:', error);
    return NextResponse.json(
      { message: 'Error creating account' },
      { status: 500 }
    );
  }
} 