import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { User } from '@/models/User';
import connectDB from '@/lib/mongodb';
import logger from '@/utils/logger';

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { name, email } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { message: 'Name and email are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(),
      _id: { $ne: session.user.id }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Email is already taken' },
        { status: 400 }
      );
    }

    // Update user with new information
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { 
        name,
        email: email.toLowerCase()
      },
      { new: true }
    ).select('name email');

    if (!updatedUser) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    logger.info('User profile updated successfully', { 
      userId: session.user.id,
      newName: name,
      newEmail: email.toLowerCase()
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email
      }
    });

  } catch (error) {
    logger.error('Error updating user profile', error);
    return NextResponse.json(
      { message: 'Error updating profile' },
      { status: 500 }
    );
  }
} 