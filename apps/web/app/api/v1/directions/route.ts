import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/v1/directions
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const direction = await prisma.direction.create({
            data: body,
        });

        return NextResponse.json(direction, { status: 201 });
    } catch (error) {
        console.error('Error creating direction:', error);
        return NextResponse.json(
            { error: 'Failed to create direction' },
            { status: 500 }
        );
    }
}
