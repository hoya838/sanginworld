export interface ImageItem {
  file: File
  dataUrl: string
  base64: string
  mimeType: string
}

export interface StoryArc {
  opening: string
  build: string
  payoff: string
}

export interface Topic {
  id: number
  title: string
  description: string
  duration: string
  hook: string
  tone: string[]
  platform: string
  platform_reason?: string
  key_scenes?: string[]
  story_arc?: StoryArc
  timeline?: Record<string, string>
  emotional_journey?: string
  narrative_hook?: string
  step2_input?: string
}

export interface ImagePrompt {
  prompt: string
  negativePrompt: string
}

export type Screen = 'input' | 'processing' | 'result'
export type StepStatus = 'pending' | 'active' | 'done'

export interface StepInfo {
  name: string
  desc: string
  status: StepStatus
  time?: string
}

export interface AppConfig {
  geminiKey: string
  kieKey: string
  username: string
  modelLite: string
  modelFlash: string
  imageModel: string
}

export interface Prompts {
  step1: string
  step1b: string
  step2: string
  step3: string
}
