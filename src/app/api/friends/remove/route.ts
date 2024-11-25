import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

    // Remove friend from user's friends list
    await User.findByIdAndUpdate(
      session.user.id,
      { $pull: { friends: friendId } }
    );

    // Remove user from friend's friends list
    await User.findByIdAndUpdate(
      friendId,
      { $pull: { friends: session.user.id } }
    );

    logger.info('Friend removed successfully', { userId: session.user.id, friendId });
    return NextResponse.json({ 
      success: true,
      message: 'Friend removed successfully' 
    });

  } catch (error) {
    logger.error('Error removing friend', error);
    return NextResponse.json(
      { message: 'Error removing friend' },
      { status: 500 }
    );
  }
} 