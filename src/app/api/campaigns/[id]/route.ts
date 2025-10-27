import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        branches: {
          include: {
            branch: true
          }
        }
      }
    })

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: campaign
    })
  } catch (error) {
    console.error('Failed to fetch campaign:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch campaign'
      },
      { status: 500 }
    )
  }
}
