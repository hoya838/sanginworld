import { NextRequest, NextResponse } from 'next/server'
import { getServerConfig } from '../../../../lib/config'

export async function POST(req: NextRequest) {
  const config = getServerConfig()
  if (!config.kieKey) return NextResponse.json({ error: 'kie.ai API 키가 설정되지 않았습니다.' }, { status: 400 })

  const { base64Data, fileName } = await req.json()

  let res: Response
  try {
    res = await fetch('https://kieai.redpandaai.co/api/file-base64-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.kieKey}`,
      },
      body: JSON.stringify({
        base64Data,
        uploadPath: 'sanginweb',
        fileName: fileName || `ref_${Date.now()}.jpg`,
      }),
    })
  } catch (e: any) {
    return NextResponse.json({ error: `네트워크 오류: ${e.message}` }, { status: 500 })
  }

  const text = await res.text()
  console.log('[kie/upload] status:', res.status, 'body:', text.slice(0, 300))

  let data: any
  try { data = JSON.parse(text) } catch {
    return NextResponse.json({ error: `응답 파싱 실패 (HTTP ${res.status}): ${text.slice(0, 200)}` }, { status: 500 })
  }

  if (!res.ok || !data?.data?.downloadUrl) {
    const errMsg = data?.msg || data?.message || data?.error || `HTTP ${res.status}`
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
  return NextResponse.json({ url: data.data.downloadUrl })
}
