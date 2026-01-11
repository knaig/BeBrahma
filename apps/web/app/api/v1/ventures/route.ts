import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/v1/ventures
export async function POST(request: NextRequest) {
    try {
        const { userId, name, ...data } = await request.json();

        const venture = await prisma.venture.create({
            data: {
                userId,
                name,
                ...data,
            },
        });

        return NextResponse.json(venture, { status: 201 });
    } catch (error) {
        console.error('Error creating venture:', error);
        return NextResponse.json(
            { error: 'Failed to create venture' },
            { status: 500 }
        );
    }
}
