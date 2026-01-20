import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const postgresUrl = process.env.POSTGRES_URL
    const databaseUrl = process.env.DATABASE_URL

    return NextResponse.json({
      success: true,
      env: {
        hasPostgresUrl: !!postgresUrl,
        hasDatabaseUrl: !!databaseUrl,
        postgresUrlPrefix: postgresUrl ? postgresUrl.substring(0, 30) + '...' : 'not set',
        databaseUrlPrefix: databaseUrl ? databaseUrl.substring(0, 30) + '...' : 'not set',
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL,
        vercelEnv: process.env.VERCEL_ENV
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
