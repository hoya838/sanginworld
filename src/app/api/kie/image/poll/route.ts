import { NextRequest, NextResponse } from 'next/server'
import { getServerConfig } from '../../../../../lib/config'

export async function GET(req: NextRequest) {
  const config = getServerConfig()
  const taskId = new URL(req.url).searchParams.get('taskId')
  const res = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
    headers: { 'Authorization': `Bearer ${config.kieKey}` }
  })
  const data = await res.json()
  return NextResponse.json(data)
}
