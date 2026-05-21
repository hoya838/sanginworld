import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

const PROMPTS_DIR = join(process.cwd(), 'config', 'prompts')

export async function GET() {
  const step1 = JSON.parse(readFileSync(join(PROMPTS_DIR, 'step1.json'), 'utf-8')).prompt
  const step1b = JSON.parse(readFileSync(join(PROMPTS_DIR, 'step1b.json'), 'utf-8')).prompt
  const step2 = JSON.parse(readFileSync(join(PROMPTS_DIR, 'step2.json'), 'utf-8')).prompt
  const step3 = JSON.parse(readFileSync(join(PROMPTS_DIR, 'step3.json'), 'utf-8')).prompt
  return NextResponse.json({ step1, step1b, step2, step3 })
}
