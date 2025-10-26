import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const branches = await prisma.branch.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: branches
    })
  } catch (error) {
    console.error('Failed to fetch branches:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch branches'
      },
      { status: 500 }
    )
  }
}
