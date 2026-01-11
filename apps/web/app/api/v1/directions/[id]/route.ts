import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/v1/directions/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const direction = await prisma.direction.findUnique({
            where: { id: params.id },
            include: {
                experiments: true,
                evidence: true,
            },
        });

        if (!direction) {
            return NextResponse.json(
                { error: 'Direction not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(direction);
    } catch (error) {
        console.error('Error fetching direction:', error);
        return NextResponse.json(
            { error: 'Failed to fetch direction' },
            { status: 500 }
        );
    }
}

// PATCH /api/v1/directions/[id]
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const updates = await request.json();

        const direction = await prisma.direction.update({
            where: { id: params.id },
            data: updates,
        });

        return NextResponse.json(direction);
    } catch (error) {
        console.error('Error updating direction:', error);
        return NextResponse.json(
            { error: 'Failed to update direction' },
            { status: 500 }
        );
    }
}
