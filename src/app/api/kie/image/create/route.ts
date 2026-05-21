import { NextRequest, NextResponse } from 'next/server'
import { getServerConfig } from '../../../../../lib/config'

export async function POST(req: NextRequest) {
  const config = getServerConfig()
  if (!config.kieKey) return NextResponse.json({ error: 'kie.ai API 키가 설정되지 않았습니다.' }, { status: 400 })

  const body = await req.json()
  console.log('[image/create] 요청 body:', JSON.stringify(body))

  const res = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.kieKey}` },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  console.log('[image/create] 응답 status:', res.status, 'body:', text)

  let data: any
  try { data = JSON.parse(text) } catch {
    return NextResponse.json({ error: `응답 파싱 실패: ${text.slice(0, 200)}` }, { status: 500 })
  }
  return NextResponse.json(data)
}
