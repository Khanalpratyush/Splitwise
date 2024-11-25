import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Expense } from '@/models/Expense';
import connectDB from '@/lib/mongodb';
import logger from '@/utils/logger';
import mongoose from 'mongoose';
import { Activity } from '@/models/Activity';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      logger.warn('Unauthorized access attempt to expenses API');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const label = searchParams.get('label');

    await connectDB();
    logger.debug('Database connection successful');

    const userId = new mongoose.Types.ObjectId(session.user.id);

    const query = {
      $or: [
        { payerId: userId },
        { 'splits.userId': userId }
      ],
      ...(label && { label })
    };

    const expenses = await Expense.find(query)
      .populate({
        path: 'payerId',
        select: 'name email _id'
      })
      .populate({
        path: 'groupId',
        select: 'name _id'
      })
      .populate({
        path: 'splits.userId',
        select: 'name email _id'
      })
      .sort({ date: -1 })
      .lean();

    logger.info('Successfully fetched expenses', { 
      count: expenses.length,
      userId: userId.toString()
    });

    return NextResponse.json(expenses);

  } catch (error) {
    logger.error('Failed to fetch expenses', error);
    return NextResponse.json(
      { message: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const data = await request.json();

    // Validate required fields
    if (!data.description || !data.amount) {
      return NextResponse.json(
        { message: 'Description and amount are required' },
        { status: 400 }
      );
    }

    // Create the expense
    const expense = await Expense.create({
      ...data,
      payerId: session.user.id,
      createdAt: new Date()
    });

    // Create activity log after expense is created
    try {
      await Activity.create({
        type: 'expense_created',
        expenseId: expense._id,
        actorId: session.user.id,
        actorName: session.user.name || 'Unknown User',
        description: `Created a new expense: ${data.description}`,
        amount: parseFloat(data.amount),
        createdAt: new Date()
      });
    } catch (activityError) {
      // Log activity creation error but don't fail the request
      logger.error('Error creating activity log', activityError);
    }

    // Populate necessary fields before returning
    const populatedExpense = await Expense.findById(expense._id)
      .populate('payerId', 'name email')
      .populate('groupId', 'name')
      .populate('splits.userId', 'name email')
      .lean();

    logger.info('Expense created successfully', { expenseId: expense._id });
    return NextResponse.json(populatedExpense);

  } catch (error) {
    logger.error('Error creating expense', error);
    
    // Check if it's a validation error
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json(
        { message: 'Invalid expense data', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Failed to create expense' },
      { status: 500 }
    );
  }
} 