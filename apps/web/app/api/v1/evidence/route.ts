import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/v1/evidence
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const ventureId = searchParams.get('ventureId');
        const directionId = searchParams.get('directionId');
        const experimentId = searchParams.get('experimentId');

        const where: any = {};
        if (ventureId) where.ventureId = ventureId;
        if (directionId) where.directionId = directionId;
        if (experimentId) where.experimentId = experimentId;

        const evidence = await prisma.decisionEvidence.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(evidence);
    } catch (error) {
        console.error('Error fetching evidence:', error);
        return NextResponse.json(
            { error: 'Failed to fetch evidence' },
            { status: 500 }
        );
    }
}

// POST /api/v1/evidence
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const evidence = await prisma.decisionEvidence.create({
            data: body,
        });

        return NextResponse.json(evidence, { status: 201 });
    } catch (error) {
        console.error('Error creating evidence:', error);
        return NextResponse.json(
            { error: 'Failed to create evidence' },
            { status: 500 }
        );
    }
}
