import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/v1/ventures/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const venture = await prisma.venture.findUnique({
            where: { id: params.id },
            include: {
                directions: true,
                experiments: true,
                integrations: true,
            },
        });

        if (!venture) {
            return NextResponse.json(
                { error: 'Venture not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(venture);
    } catch (error) {
        console.error('Error fetching venture:', error);
        return NextResponse.json(
            { error: 'Failed to fetch venture' },
            { status: 500 }
        );
    }
}

// PATCH /api/v1/ventures/[id]
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const updates = await request.json();

        const venture = await prisma.venture.update({
            where: { id: params.id },
            data: updates,
        });

        return NextResponse.json(venture);
    } catch (error) {
        console.error('Error updating venture:', error);
        return NextResponse.json(
            { error: 'Failed to update venture' },
            { status: 500 }
        );
    }
}
