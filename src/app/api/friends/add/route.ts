import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { User } from '@/models/User';
import connectDB from '@/lib/mongodb';
import logger from '@/utils/logger';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { friendId } = await request.json();

    if (!friendId) {
      return NextResponse.json(
        { message: 'Friend ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if friend exists
    const friend = await User.findById(friendId);
    if (!friend) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already friends
    const currentUser = await User.findById(session.user.id);
    if (currentUser?.friends.includes(friendId)) {
      return NextResponse.json(
        { message: 'Already friends' },
        { status: 400 }
      );
    }

    // Add friend to user's friends list
    await User.findByIdAndUpdate(
      session.user.id,
      { $addToSet: { friends: friendId } }
    );

    // Add user to friend's friends list
    await User.findByIdAndUpdate(
      friendId,
      { $addToSet: { friends: session.user.id } }
    );

    logger.info('Friend added successfully', { userId: session.user.id, friendId });
    return NextResponse.json({ 
      success: true,
      message: 'Friend added successfully' 
    });

  } catch (error) {
    logger.error('Error adding friend', { error });
    return NextResponse.json(
      { message: 'Error adding friend' },
      { status: 500 }
    );
  }
} 