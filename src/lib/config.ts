import type { AppConfig } from '../types'

export function getServerConfig(): AppConfig {
  // Vercel 환경변수 우선 (config/api.json이 .gitignore에 포함)
  if (process.env.GEMINI_KEY || process.env.KIE_KEY) {
    return {
      geminiKey: process.env.GEMINI_KEY || '',
      kieKey: process.env.KIE_KEY || '',
      username: process.env.APP_USERNAME || '사용자',
      modelLite: process.env.MODEL_LITE || 'gemini-2.5-flash-lite-preview-06-17',
      modelFlash: process.env.MODEL_FLASH || 'gemini-2.5-flash-preview-05-20',
      imageModel: process.env.IMAGE_MODEL || 'nano-banana-2',
    }
  }
  // 로컬 개발: 파일에서 읽기
  const { readFileSync } = require('fs')
  const { join } = require('path')
  return JSON.parse(readFileSync(join(process.cwd(), 'config', 'api.json'), 'utf-8'))
}
