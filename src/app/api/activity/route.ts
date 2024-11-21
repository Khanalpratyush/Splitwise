import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { Activity } from '@/models/Activity';
import connectDB from '@/lib/mongodb';
import logger from '@/utils/logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get all activities related to expenses where the user is involved
    const activities = await Activity.find({
      $or: [
        { 'expense.payerId': session.user.id },
        { 'expense.splits.userId': session.user.id }
      ]
    })
    .sort({ timestamp: -1 })
    .limit(50)
    .populate({
      path: 'expense',
      select: 'description amount date payerId splits',
      populate: {
        path: 'payerId',
        select: 'name email'
      }
    })
    .lean();

    logger.info('Activities fetched successfully', { count: activities.length });
    return NextResponse.json(activities);
  } catch (error) {
    logger.error('Error fetching activities', error);
    return NextResponse.json(
      { message: 'Error fetching activities' },
      { status: 500 }
    );
  }
} 