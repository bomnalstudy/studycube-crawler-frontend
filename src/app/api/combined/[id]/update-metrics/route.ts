import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { cost, impressions, clicks } = body

    const combined = await prisma.combinedAnalysis.update({
      where: { id },
      data: {
        cost,
        impressions,
        clicks
      }
    })

    return NextResponse.json({
      success: true,
      data: combined
    })
  } catch (error) {
    console.error('Failed to update metrics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update metrics' },
      { status: 500 }
    )
  }
}
