import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { Group } from '@/models/Group';
import connectDB from '@/lib/mongodb';
import logger from '@/utils/logger';
import mongoose from 'mongoose';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const userId = new mongoose.Types.ObjectId(session.user.id);

    const groups = await Group.find({
      'members.userId': userId
    })
    .populate('ownerId', 'name email')
    .populate('members.userId', 'name email')
    .sort({ lastActivity: -1 })
    .lean();

    return NextResponse.json(groups);

  } catch (error) {
    logger.error('Failed to fetch groups', error);
    return NextResponse.json(
      { message: 'Failed to fetch groups' },
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

    const body = await request.json();
    const { name, description, category, memberIds } = body;

    if (!name || !memberIds?.length) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate memberIds are valid ObjectIds
    const validMemberIds = memberIds.every((id: string) => 
      mongoose.Types.ObjectId.isValid(id)
    );

    if (!validMemberIds) {
      return NextResponse.json(
        { message: 'Invalid member IDs provided' },
        { status: 400 }
      );
    }

    const userId = new mongoose.Types.ObjectId(session.user.id);

    // Create the group document
    const groupData = {
      name: name.trim(),
      description: description?.trim() || '',
      category: category || 'other',
      ownerId: userId,
      members: [
        {
          userId: userId,
          role: 'owner'
        },
        ...memberIds.map((id: string) => ({
          userId: new mongoose.Types.ObjectId(id),
          role: 'member'
        }))
      ],
      lastActivity: new Date()
    };

    const group = await Group.create(groupData);

    const populatedGroup = await Group.findById(group._id)
      .populate('ownerId', 'name email')
      .populate('members.userId', 'name email')
      .lean();

    logger.info('Group created successfully', { groupId: group._id });
    return NextResponse.json(populatedGroup);

  } catch (error) {
    logger.error('Error creating group', { error });
    
    if (error instanceof mongoose.Error.ValidationError) {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { 
          message: 'Invalid group data', 
          errors: validationErrors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Error creating group' },
      { status: 500 }
    );
  }
} 