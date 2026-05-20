import { NextRequest, NextResponse } from 'next/server'
import { syncToSheets } from '@/lib/sheets'
import { GeneralMetrics } from '@/lib/types'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const { metrics }: { metrics: GeneralMetrics } = await req.json()
    if (!process.env.GOOGLE_SPREADSHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return NextResponse.json({ ok: false, error: 'Sheets no configurado' })
    }
    await syncToSheets(metrics)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[sync]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
