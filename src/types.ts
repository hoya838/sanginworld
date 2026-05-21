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
  content_type?: string
  funnel_stage?: string
  cta?: string
  content_angle?: string
  key_scenes?: string[]
  story_arc?: StoryArc
  timeline?: Record<string, string>
  emotional_journey?: string
  narrative_hook?: string
  step2_input?: string
}

export interface ImageFingerprint {
  subject?: {
    hair: string
    outfit: string
    accessories: string[]
    pose: string
    framing: string
  }
  shot_composition: string
  background: {
    location: string
    key_elements: string[]
    scale: string
    depth: string
  }
  color_palette: {
    dominant: string[]
    temperature: string
  }
  lighting: {
    direction: string
    quality: string
  }
  mood: string[]
  product?: {
    name: string
    color: string
    size: string
    placement: string
    visibility: string
    key_features: string[]
  }
  package?: {
    shape: string
    material: string
    label_color: string[]
    brand_colors: string[]
    surface_texture: string
    visual_pattern: string
    size: string
    dual_structure?: string
    interior_visible: boolean
    visible_faces?: string
  }
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
  step1_5: string
  step2: string
  step3: string
}
