import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { User } from '@/models/User';
import { UserDocument } from '@/types/mongoose';
import connectDB from '@/lib/mongodb';
import logger from '@/utils/logger';
import type { NextRequest } from 'next/server';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    logger.debug('Fetching friends for user', { userId: session.user.id });
    await connectDB();

    const currentUser = await User.findById(session.user.id)
      .populate('friends', 'name email')
      .lean();

    if (!currentUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const friends = currentUser.friends || [];
    logger.info('Successfully fetched friends', { count: friends.length });
    return NextResponse.json(friends);
  } catch (error) {
    logger.error('Error fetching friends', error);
    return NextResponse.json(
      { message: 'Error fetching friends' },
      { status: 500 }
    );
  }
} 