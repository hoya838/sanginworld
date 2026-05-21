import { NextRequest, NextResponse } from 'next/server'
import { getServerConfig } from '../../../../../lib/config'

export async function POST(req: NextRequest) {
  const config = getServerConfig()
  if (!config.kieKey) return NextResponse.json({ error: 'kie.ai API 키가 설정되지 않았습니다.' }, { status: 400 })

  const body = await req.json()
  const res = await fetch('https://api.kie.ai/api/v1/veo/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.kieKey}` },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  return NextResponse.json(data)
}
