const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.POSTGRES_URL
    }
  }
})

async function checkSchema() {
  try {
    const tables = [
      'users',
      'branches',
      'daily_metrics',
      'daily_visitors',
      'campaigns',
      'campaign_branches',
      'strategies',
      'strategy_branches',
      'combined_analyses',
      'combined_branches',
      'hourly_usage',
      'ticket_revenue',
      'ticket_buyers'
    ]

    for (const tableName of tables) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`Table: ${tableName}`)
      console.log('='.repeat(60))

      try {
        const columns = await prisma.$queryRaw`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = ${tableName}
          ORDER BY ordinal_position
        `

        if (columns.length === 0) {
          console.log(`⚠️  Table '${tableName}' not found in database`)
        } else {
          columns.forEach((col) => {
            const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)'
            console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}`)
          })
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}`)
      }
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSchema()
