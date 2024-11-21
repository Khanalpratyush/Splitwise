import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { Expense } from '@/models/Expense';
import connectDB from '@/lib/mongodb';
import logger from '@/utils/logger';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { expenseId } = await request.json();

    if (!expenseId) {
      return NextResponse.json(
        { message: 'Expense ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the expense and update the specific user's split as settled
    const expense = await Expense.findOneAndUpdate(
      {
        _id: expenseId,
        'splits.userId': session.user.id
      },
      {
        $set: {
          'splits.$.settled': true
        }
      },
      { new: true }
    );

    if (!expense) {
      return NextResponse.json(
        { message: 'Expense not found' },
        { status: 404 }
      );
    }

    logger.info('Expense settled successfully', { 
      expenseId,
      userId: session.user.id 
    });

    return NextResponse.json({ 
      message: 'Expense settled successfully',
      expense 
    });
  } catch (error) {
    logger.error('Error settling expense', error);
    return NextResponse.json(
      { message: 'Error settling expense' },
      { status: 500 }
    );
  }
} 