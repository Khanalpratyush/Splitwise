import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { Expense } from '@/models/Expense';
import connectDB from '@/lib/mongodb';
import logger from '@/utils/logger';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
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

    const expense = await Expense.findById(params.id);

    if (!expense) {
      return NextResponse.json({ message: 'Expense not found' }, { status: 404 });
    }

    if (expense.payerId.toString() !== session.user.id) {
      return NextResponse.json({ message: 'Only the creator can edit this expense' }, { status: 403 });
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
      { message: 'Error updating expense' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const expense = await Expense.findById(params.id);

    if (!expense) {
      return NextResponse.json({ message: 'Expense not found' }, { status: 404 });
    }

    if (expense.payerId.toString() !== session.user.id) {
      return NextResponse.json(
        { message: 'Only the creator can delete this expense' },
        { status: 403 }
      );
    }

    await Expense.findByIdAndDelete(params.id);

    logger.info('Expense deleted successfully', { expenseId: params.id });
    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    logger.error('Error deleting expense', error);
    return NextResponse.json(
      { message: 'Error deleting expense' },
      { status: 500 }
    );
  }
} 