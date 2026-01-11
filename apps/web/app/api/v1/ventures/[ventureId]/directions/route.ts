import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/v1/ventures/[ventureId]/directions
export async function GET(
    request: NextRequest,
    { params }: { params: { ventureId: string } }
) {
    try {
        const directions = await prisma.direction.findMany({
            where: { ventureId: params.ventureId },
            include: {
                experiments: true,
                evidence: true,
            },
            orderBy: { expectedValue: 'desc' },
        });

        return NextResponse.json(directions);
    } catch (error) {
        console.error('Error fetching directions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch directions' },
            { status: 500 }
        );
    }
}
