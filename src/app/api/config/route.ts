import { NextRequest, NextResponse } from 'next/server'
import { getServerConfig } from '../../../lib/config'

export async function GET() {
  return NextResponse.json(getServerConfig())
}

export async function POST(req: NextRequest) {
  // Vercel: 파일 쓰기 불가, 환경변수로 관리
  if (process.env.GEMINI_KEY || process.env.KIE_KEY) {
    return NextResponse.json({ ok: true, note: 'Vercel 환경에서는 환경변수로 관리됩니다.' })
  }
  // 로컬 개발: 파일에 저장
  const { writeFileSync, readFileSync } = require('fs')
  const { join } = require('path')
  const CONFIG_PATH = join(process.cwd(), 'config', 'api.json')
  const body = await req.json()
  const current = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
  const updated = { ...current, ...body }
  writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf-8')
  return NextResponse.json({ ok: true })
}
