import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Expense } from '@/models/Expense';
import connectDB from '@/lib/mongodb';
import logger from '@/utils/logger';
import { ObjectId } from 'mongodb';


export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { description, amount, groupId, splits } = body;

    if (!description || !amount) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    const expense = await Expense.findById(context.params.id);
    if (!expense) {
      return NextResponse.json({ message: 'Expense not found' }, { status: 404 });
    }

    if (expense.payerId.toString() !== session.user.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    expense.description = description;
    expense.amount = amount;
    expense.groupId = groupId || null;
    expense.splits = splits;

    await expense.save();

    await expense.populate('payerId groupId', 'name');
    logger.info('Expense updated successfully', { expenseId: expense._id });
    return NextResponse.json(expense, { status: 200 });
  } catch (error) {
    logger.error('Error updating expense', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const expenseId = context.params.id;
    if (!expenseId || expenseId.length !== 24) {
      return NextResponse.json(
        { message: 'Invalid expense ID' },
        { status: 400 }
      );
    }

    await connectDB();

    const expense = await Expense.findById(expenseId);
    
    if (!expense) {
      logger.warn('Expense not found or already deleted', { expenseId });
      return NextResponse.json(
        { message: 'Expense not found or already deleted', success: true },
        { status: 200 }
      );
    }

    const payerId = expense.payerId.toString();
    if (payerId !== session.user.id) {
      return NextResponse.json(
        { message: 'Only the creator can delete this expense' },
        { status: 403 }
      );
    }

    await Expense.findByIdAndDelete(expenseId);

    logger.info('Expense deleted successfully', { 
      expenseId,
      userId: session.user.id 
    });

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting expense', {
      error,
      expenseId: context.params.id,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { message: 'Error deleting expense' },
      { status: 500 }
    );
  }
}
