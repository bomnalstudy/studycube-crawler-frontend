import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    const combined = await prisma.combinedAnalysis.findMany({
      include: {
        branch: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const combinedWithAnalysis = await Promise.all(
      combined.map(async (item) => {
        try {
          const afterMetrics = await prisma.dailyMetric.findMany({
            where: {
              branchId: item.branchId === 'all' ? undefined : item.branchId,
              date: { gte: item.startDate, lte: item.endDate }
            }
          })

          const days = Math.ceil((item.endDate.getTime() - item.startDate.getTime()) / (1000 * 60 * 60 * 24))
          const beforeStartDate = new Date(item.startDate)
          beforeStartDate.setDate(beforeStartDate.getDate() - days)
          const beforeEndDate = new Date(item.startDate)
          beforeEndDate.setDate(beforeEndDate.getDate() - 1)

          const beforeMetrics = await prisma.dailyMetric.findMany({
            where: {
              branchId: item.branchId === 'all' ? undefined : item.branchId,
              date: { gte: beforeStartDate, lte: beforeEndDate }
            }
          })

          const afterRevenue = afterMetrics.reduce((sum, m) => sum + Number(m.totalRevenue || 0), 0)
          const beforeRevenue = beforeMetrics.reduce((sum, m) => sum + Number(m.totalRevenue || 0), 0)
          const afterNewUsers = afterMetrics.reduce((sum, m) => sum + (m.newUsers || 0), 0)
          const beforeNewUsers = beforeMetrics.reduce((sum, m) => sum + (m.newUsers || 0), 0)

          const analysis = {
            changes: {
              revenueGrowth: beforeRevenue > 0 ? ((afterRevenue - beforeRevenue) / beforeRevenue) * 100 : 0,
              newUsersGrowth: beforeNewUsers > 0 ? ((afterNewUsers - beforeNewUsers) / beforeNewUsers) * 100 : 0
            }
          }

          return { ...item, analysis }
        } catch (error) {
          return item
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: combinedWithAnalysis
    })
  } catch (error) {
    console.error('Failed to fetch combined:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch combined' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, branchId, startDate, endDate, cost, impressions, clicks, strategyType, reason, description } = body

    const combined = await prisma.combinedAnalysis.create({
      data: {
        branchId: branchId || 'all',
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        cost,
        impressions,
        clicks,
        strategyType,
        reason,
        description
      }
    })

    let branchName = '전체지점'
    if (branchId && branchId !== 'all') {
      const branch = await prisma.branch.findUnique({ where: { id: branchId } })
      if (branch) branchName = branch.name
    }

    try {
      const combinedDir = join(process.cwd(), 'combined')
      const branchDir = join(combinedDir, branchName)
      await mkdir(branchDir, { recursive: true })

      const fileName = `${name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${Date.now()}.json`
      const filePath = join(branchDir, fileName)

      await writeFile(filePath, JSON.stringify({ ...body, combined, savedAt: new Date().toISOString() }, null, 2), 'utf-8')
    } catch (fsError) {
      console.error('Failed to save combined file:', fsError)
    }

    return NextResponse.json({
      success: true,
      data: combined
    })
  } catch (error) {
    console.error('Failed to save combined:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save combined' },
      { status: 500 }
    )
  }
}
