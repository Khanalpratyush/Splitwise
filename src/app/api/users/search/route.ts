import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { User, IUser } from '@/models/User';
import connectDB from '@/lib/mongodb';
import logger from '@/utils/logger';
import mongoose from 'mongoose';

interface PopulatedUser extends Omit<IUser, 'friends'> {
  friends: IUser[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('email');

    if (!query) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const currentUser = await User.findById(session.user.id)
      .populate<{ friends: IUser[] }>('friends', 'name email')
      .lean() as unknown as PopulatedUser;

    if (!currentUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const friendIds = currentUser.friends?.map((f: IUser) => f._id.toString()) || [];

    const user = await User.findOne({
      email: query,
      _id: { $ne: session.user.id }
    }).select('name email _id').lean() as unknown as IUser;

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    if (friendIds.includes(user._id.toString())) {
      return NextResponse.json(
        { message: 'User is already your friend' },
        { status: 400 }
      );
    }

    return NextResponse.json(user);

  } catch (error) {
    logger.error('Error searching users', error);
    return NextResponse.json(
      { message: 'Error searching users' },
      { status: 500 }
    );
  }
} 