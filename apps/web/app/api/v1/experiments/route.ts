import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/v1/experiments
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const directionId = searchParams.get('directionId');
        const status = searchParams.get('status');

        const where: any = {};
        if (directionId) where.directionId = directionId;
        if (status) where.status = status;

        const experiments = await prisma.decisionExperiment.findMany({
            where,
            include: {
                gates: true,
                evidence: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(experiments);
    } catch (error) {
        console.error('Error fetching experiments:', error);
        return NextResponse.json(
            { error: 'Failed to fetch experiments' },
            { status: 500 }
        );
    }
}

// POST /api/v1/experiments
export async function POST(request: NextRequest) {
    try {
        const { gates, ...experimentData } = await request.json();

        const experiment = await prisma.decisionExperiment.create({
            data: {
                ...experimentData,
                gates: gates
                    ? {
                        create: gates.map((gate: any, index: number) => ({
                            ...gate,
                            order: index + 1,
                        })),
                    }
                    : undefined,
            },
            include: {
                gates: true,
            },
        });

        return NextResponse.json(experiment, { status: 201 });
    } catch (error) {
        console.error('Error creating experiment:', error);
        return NextResponse.json(
            { error: 'Failed to create experiment' },
            { status: 500 }
        );
    }
}
