'use client'

import { useState, useCallback, useEffect } from 'react'
import type { AppConfig, ImageItem, Prompts, Topic, ImagePrompt, Screen, StepInfo } from '../types'
import InputScreen from '../components/InputScreen'
import ProcessingScreen from '../components/ProcessingScreen'
import ResultScreen from '../components/ResultScreen'
import SettingsModal from '../components/SettingsModal'
import ErrorModal from '../components/ErrorModal'
import Toast from '../components/Toast'

const DEFAULT_CONFIG: AppConfig = {
  geminiKey: '', kieKey: '', username: '사용자',
  modelLite: 'gemini-2.5-flash-lite-preview-06-17',
  modelFlash: 'gemini-2.5-flash-preview-05-20',
  imageModel: 'nano-banana-2',
}

const DEFAULT_STEPS: StepInfo[] = [
  { name: '이미지 분석',   desc: '업로드 하신 이미지를 분석하고 있어요.',         status: 'pending' },
  { name: '스크립트 분석', desc: '영상 스크립트를 분석하고 있어요.',              status: 'pending' },
  { name: '이미지 생성중', desc: '레퍼런스 이미지를 생성하고 있어요.',            status: 'pending' },
  { name: '영상생성중',    desc: '이미지와 설명을 바탕으로 영상을 만들고 있어요.', status: 'pending' },
]

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export default function Home() {
  const [screen, setScreen] = useState<Screen>('input')
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [prompts, setPrompts] = useState<Prompts | null>(null)
  const [ratio, setRatio] = useState<'9:16' | '16:9'>('16:9')
  const [images, setImages] = useState<ImageItem[]>([])
  const [description, setDescription] = useState('')
  const [topics, setTopics] = useState<Topic[]>([])
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [topicsVisible, setTopicsVisible] = useState(false)
  const [steps, setSteps] = useState<StepInfo[]>(DEFAULT_STEPS)
  const [videoUrl, setVideoUrl] = useState('')
  const [startTime, setStartTime] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showImageHint, setShowImageHint] = useState(false)
  const [showTopicHint, setShowTopicHint] = useState(false)
  const [toast, setToast] = useState({ message: '', visible: false })
  const [error, setError] = useState({ step: '', message: '', visible: false })
  // generated outputs for result screen
  const [genStep2Output, setGenStep2Output] = useState('')
  const [genStep3Output, setGenStep3Output] = useState('')
  const [genReferenceImages, setGenReferenceImages] = useState<string[]>([])
  const [genVideoPrompt, setGenVideoPrompt] = useState('')

  // Load config + prompts on mount
  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then((c: AppConfig) => {
      setConfig(c)
      if (!c.geminiKey || !c.kieKey) setTimeout(() => setSettingsOpen(true), 300)
    })
    fetch('/api/prompts').then(r => r.json()).then(setPrompts)
  }, [])

  function showToast(message: string) {
    setToast({ message, visible: true })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500)
  }

  async function handleSaveSettings(updated: AppConfig) {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    setConfig(updated)
    setSettingsOpen(false)
    showToast('저장되었습니다.')
  }

  // ─── IMAGE UPLOAD ───
  async function addImages(files: File[]) {
    const newImages = [...images]
    for (const file of files) {
      if (newImages.length >= 2) { showToast('최대 2장까지 업로드 가능합니다.'); break }
      const dataUrl = await readFileAsDataURL(file)
      const base64 = dataUrl.split(',')[1]
      newImages.push({ file, dataUrl, base64, mimeType: file.type })
    }
    setImages(newImages)
    setShowImageHint(false)
  }

  function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = e => {
        const original = e.target!.result as string
        const img = new Image()
        img.onload = () => {
          const MAX = 1280
          let { width, height } = img
          if (width > MAX || height > MAX) {
            if (width >= height) { height = Math.round(height * MAX / width); width = MAX }
            else { width = Math.round(width * MAX / height); height = MAX }
          }
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
          res(canvas.toDataURL('image/jpeg', 0.82))
        }
        img.onerror = () => res(original)
        img.src = original
      }
      r.onerror = rej
      r.readAsDataURL(file)
    })
  }

  function removeImage(idx: number) {
    setImages(imgs => imgs.filter((_, i) => i !== idx))
  }

  // ─── GEMINI API ───
  async function callGemini(model: string, systemPrompt: string, imgs: ImageItem[], extraText = '') {
    const parts: object[] = [{ text: systemPrompt + (extraText ? '\n\n' + extraText : '') }]
    for (const img of imgs) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } })
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Gemini API 오류: ${(err as any)?.error?.message || res.statusText}`)
    }

    const data = await res.json()
    return (data.candidates?.[0]?.content?.parts?.[0]?.text || '') as string
  }

  // ─── STEP 1 — 주제 추천 ───
  async function runStep1() {
    if (images.length === 0) { setShowImageHint(true); return }
    if (!prompts) { showToast('프롬프트 로딩 중입니다. 잠시 후 시도해주세요.'); return }

    setTopicsVisible(true)
    setTopicsLoading(true)
    setTopics([])
    setSelectedTopic(null)

    try {
      const desc = description.trim()
      const extra = desc ? `[사용자 설명]\n${desc}` : ''
      const raw = await callGemini(config.modelLite, prompts.step1 + '\nmode: detail', images, extra)
      const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(jsonStr)
      setTopics(parsed.topics || [])
    } catch (e: any) {
      showToast(`오류: ${e.message}`)
    } finally {
      setTopicsLoading(false)
    }
  }

  // ─── STEP STATE ───
  function updateStep(idx: number, status: StepInfo['status'], desc?: string, time?: string) {
    setSteps(prev => prev.map((s, i) =>
      i === idx ? { ...s, status, ...(desc ? { desc } : {}), ...(time ? { time } : {}) } : s
    ))
  }

  // ─── GENERATION FLOW ───
  async function startGeneration() {
    if (images.length === 0) { setShowImageHint(true); return }
    if (!prompts) { showToast('프롬프트 로딩 중입니다.'); return }
    if (!config.geminiKey) { setSettingsOpen(true); return }

    const topicsShown = topicsVisible && !topicsLoading
    const desc = description.trim()
    if (topicsShown && !selectedTopic && !desc) {
      setShowTopicHint(true); return
    }

    const t0 = Date.now()
    setStartTime(t0)
    setSteps(DEFAULT_STEPS.map(s => ({ ...s })))
    setScreen('processing')

    let currentStep = 'unknown'
    let topic = selectedTopic
    let step2Output = ''
    let step3Output = ''
    let imagePrompts: ImagePrompt[] = []
    let referenceImages: string[] = []

    try {
      // ── STEP 1B (description → topic) ──
      if (!topic) {
        currentStep = 'step1b'
        updateStep(0, 'active', '이미지와 설명을 바탕으로 주제를 분석하고 있어요.')
        const extra = `[사용자 설명]\n${desc}\n[영상 비율]\n${ratio}`
        const raw = await callGemini(config.modelLite, prompts.step1b, images, extra)
        const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const parsed = JSON.parse(jsonStr)
        topic = parsed.topics?.[0] || null
        if (!topic) throw new Error('STEP 1B: 주제 생성에 실패했습니다.')
      }

      // ── STEP 1.5 ──
      currentStep = 'step1_5'
      updateStep(0, 'active', '이미지 시각 속성을 분석하고 있어요.')
      let fingerprintBlock = ''
      if (prompts.step1_5) {
        try {
          const raw1_5 = await callGemini(config.modelFlash, prompts.step1_5, images)
          const json1_5 = raw1_5.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          JSON.parse(json1_5)
          fingerprintBlock = `[IMAGE FINGERPRINT]\n${json1_5}\n[/IMAGE FINGERPRINT]\n\n`
        } catch (e: any) {
          console.warn('[step1_5] 핑거프린트 분석 실패, 없이 진행:', e.message)
        }
      }

      // ── STEP 2 ──
      currentStep = 'step2'
      updateStep(0, 'active', '주제와 이미지를 바탕으로 스토리보드를 생성하고 있어요.')
      {
        const step2Input = topic.step2_input || [
          `- 선택 주제: ${topic.title} / ${topic.description} / story_arc: ${topic.story_arc?.opening} → ${topic.story_arc?.build} → ${topic.story_arc?.payoff} / emotional_journey: ${topic.emotional_journey}`,
          `- 영상 비율: ${ratio}`,
          `- 총 길이: 8s`,
          `- 첫 프레임 이미지: 첨부`,
        ].join('\n')
        step2Output = await callGemini(config.modelFlash, prompts.step2, images, fingerprintBlock + step2Input)
        if (!step2Output) throw new Error('STEP 2: 스토리보드 생성에 실패했습니다.')
        setGenStep2Output(step2Output)
        setGenVideoPrompt(extractVideoPrompt(step2Output))
      }
      updateStep(0, 'done', '스토리보드 생성 완료', `${Math.round((Date.now() - t0) / 1000)}s`)

      // ── STEP 3 ──
      currentStep = 'step3'
      updateStep(1, 'active', '영상 프롬프트와 이미지 프롬프트를 분석하고 있어요.')
      {
        const match = step2Output.match(/\[STORYBOARD → STEP 3\]([\s\S]*?)(?:\n---|\n\[|$)/)
        const storyboardBlock = match
          ? '[STORYBOARD → STEP 3]\n' + match[1].trim()
          : step2Output
        step3Output = await callGemini(config.modelFlash, prompts.step3, images, fingerprintBlock + storyboardBlock)
        if (!step3Output) throw new Error('STEP 3: 이미지 프롬프트 생성에 실패했습니다.')
        setGenStep3Output(step3Output)
        imagePrompts = parseStep3Prompts(step3Output)
      }
      updateStep(1, 'done', '이미지 프롬프트 생성 완료', `${Math.round((Date.now() - t0) / 1000)}s`)

      // ── IMAGE GENERATION ──
      currentStep = 'image'
      updateStep(2, 'active', '원본 이미지를 업로드하고 레퍼런스 이미지를 생성하고 있어요.')
      let originalImageUrls: string[] = []
      try {
        originalImageUrls = await uploadOriginalImages(images)
        console.log('[startGeneration] 원본 이미지 업로드 완료:', originalImageUrls)
      } catch (uploadErr: any) {
        console.warn('[startGeneration] 원본 이미지 업로드 실패, image_input 없이 진행:', uploadErr.message)
      }
      referenceImages = await runImageGeneration(imagePrompts, config.imageModel, t0, originalImageUrls)
      setGenReferenceImages(referenceImages)
      updateStep(2, 'done', '레퍼런스 이미지 생성 완료', `${Math.round((Date.now() - t0) / 1000)}s`)

      // ── VIDEO GENERATION ──
      currentStep = 'video'
      updateStep(3, 'active', 'kie.ai Veo 3.1 Fast로 영상을 생성하고 있어요.')
      let url: string
      try {
        url = await runVideoGeneration(step2Output, referenceImages, ratio, t0, 'veo3_fast')
      } catch (firstErr: any) {
        const isServerErr = (e: any) => e.message?.includes('Internal Error') || e.message?.includes('500')
        const isAudioErr = (e: any) => e.message?.toLowerCase().includes('audio')

        if (isAudioErr(firstErr)) {
          console.warn('[video] 오디오 필터 오류, 15초 후 1회 재시도')
          updateStep(3, 'active', '오디오 필터 오류 — 재시도 중...')
          await sleep(15000)
          url = await runVideoGeneration(step2Output, referenceImages, ratio, t0, 'veo3_fast')
        } else if (!isServerErr(firstErr)) {
          throw firstErr
        } else {
          console.warn('[video] veo3_fast 1차 실패, 10초 후 재시도')
          updateStep(3, 'active', 'Veo 서버 오류 — 재시도 중...')
          await sleep(10000)

          try {
            url = await runVideoGeneration(step2Output, referenceImages, ratio, t0, 'veo3_fast')
          } catch (secondErr: any) {
            if (!isServerErr(secondErr)) throw secondErr

            console.warn('[video] veo3_fast 2차 실패, veo3_lite로 전환')
            updateStep(3, 'active', 'Veo 서버 오류 — veo3_lite로 전환 중...')
            await sleep(5000)
            url = await runVideoGeneration(step2Output, referenceImages, ratio, t0, 'veo3_lite')
          }
        }
      }
      updateStep(3, 'done', '영상 생성 완료!', `${Math.round((Date.now() - t0) / 1000)}s`)

      setVideoUrl(url)
      setElapsed(Math.round((Date.now() - t0) / 1000))
      setScreen('result')
    } catch (e: any) {
      console.error('[오류 단계:', currentStep, ']', e)
      setScreen('input')
      setError({ step: currentStep, message: e.message || String(e), visible: true })
    }
  }

  // ─── PNG → JPG 변환 후 kie.ai 재업로드 (Veo FIRST_AND_LAST_FRAMES_2_VIDEO 호환) ───
  async function convertToJpgAndUpload(imgUrl: string): Promise<string> {
    const res = await fetch(imgUrl)
    const blob = await res.blob()
    const img = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    const raw = await fetch('/api/kie/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Data: dataUrl, fileName: `converted_${Date.now()}.jpg` }),
    })
    const text = await raw.text()
    let data: any
    try { data = JSON.parse(text) } catch {
      throw new Error(`변환 이미지 업로드 실패: ${text.slice(0, 200)}`)
    }
    if (data.error) throw new Error(`변환 이미지 업로드 실패: ${data.error}`)
    return data.url
  }

  // ─── UPLOAD ORIGINAL IMAGES TO KIE.AI ───
  async function uploadOriginalImages(imgs: ImageItem[]): Promise<string[]> {
    const urls: string[] = []
    for (const img of imgs) {
      const ext = img.mimeType.split('/')[1] || 'jpg'
      const raw = await fetch('/api/kie/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data: img.dataUrl,
          fileName: `ref_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`,
        }),
      })
      const text = await raw.text()
      let res: any
      try { res = JSON.parse(text) } catch {
        throw new Error(`원본 이미지 업로드 실패 (HTTP ${raw.status}): ${text.slice(0, 200)}`)
      }
      if (res.error) throw new Error(`원본 이미지 업로드 실패: ${res.error}`)
      urls.push(res.url)
      console.log('[uploadOriginalImages] 업로드 완료:', res.url)
    }
    return urls
  }

  // ─── IMAGE GENERATION ───
  function buildImageInput(model: string, p: ImagePrompt, sceneImageUrl: string | undefined) {
    if (model === 'google/imagen4-fast')
      return { prompt: p.prompt, negative_prompt: p.negativePrompt, aspect_ratio: ratio, num_images: '1' }
    if (model === 'gpt-image-2-image-to-image')
      return { prompt: p.prompt, aspect_ratio: ratio, resolution: '2K', ...(sceneImageUrl && { input_urls: [sceneImageUrl] }) }
    return { prompt: p.prompt, aspect_ratio: ratio, resolution: '2K', output_format: 'jpg', ...(sceneImageUrl && { image_input: [sceneImageUrl] }) }
  }

  async function generateOneImage(model: string, p: ImagePrompt, sceneImageUrl: string | undefined, t0: number): Promise<string> {
    const input = buildImageInput(model, p, sceneImageUrl)
    console.log('[generateOneImage] model:', model, '| ref:', sceneImageUrl ?? '없음')

    const attempt = async () => {
      const taskRes = await fetch('/api/kie/image/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, input }),
      }).then(r => r.json())
      const taskId = taskRes?.data?.taskId
      if (!taskId) throw new Error(`kie.ai 이미지: taskId를 받지 못했습니다. 응답: ${JSON.stringify(taskRes)}`)
      const imgUrl = await pollImageTask(taskId, t0)
      console.log('[generateOneImage] 생성 URL:', imgUrl)
      return imgUrl
    }

    try {
      return await attempt()
    } catch (err: any) {
      if (err.message?.toLowerCase().includes('internal error')) {
        console.warn('[generateOneImage] 서버 오류, 10초 후 재시도:', err.message)
        await sleep(10000)
        return attempt()
      }
      throw err
    }
  }

  async function runImageGeneration(imagePrompts: ImagePrompt[], model: string, t0: number, originalImageUrls: string[] = []) {
    const twoOriginals = originalImageUrls.length >= 2

    if (twoOriginals) {
      // 이미지 2장: 각 씬이 독립적 → 병렬 생성
      console.log('[runImageGeneration] 병렬 생성 시작')
      return Promise.all(imagePrompts.map((p, i) => {
        const sceneImageUrl = originalImageUrls[i] ?? originalImageUrls[0]
        return generateOneImage(model, p, sceneImageUrl, t0)
      }))
    }

    // 이미지 1장: 모든 씬이 원본을 ref로 사용 — Scene 1 결과를 Scene 2 ref로 쓰면
    // 스토리상 Scene 1에 패키지가 없을 때 Scene 2가 원본 패키지 정보를 잃는 문제 방지
    const results: string[] = []
    for (let i = 0; i < imagePrompts.length; i++) {
      results.push(await generateOneImage(model, imagePrompts[i], originalImageUrls[0], t0))
    }
    return results
  }

  async function pollImageTask(taskId: string, t0: number, maxWaitMs = 360000) {
    const start = Date.now()
    while (Date.now() - start < maxWaitMs) {
      await sleep(2000)
      let res: any
      try {
        res = await fetch(`/api/kie/image/poll?taskId=${taskId}`).then(r => r.json())
      } catch (e: any) {
        console.warn('[pollImageTask] 네트워크 오류, 재시도:', e.message)
        continue
      }
      console.log('[pollImageTask]', JSON.stringify(res))
      const d = res?.data
      const s = d?.state
      if (s === 'success') {
        let result: any = {}
        try { result = JSON.parse(d.resultJson || '{}') } catch {}
        const url = result.resultUrls?.[0]
        if (!url) throw new Error('kie.ai 이미지: resultUrls가 비어 있습니다. (resultJson: ' + d.resultJson + ')')
        return url as string
      }
      if (s === 'fail') throw new Error(`kie.ai 이미지 실패: ${d?.failMsg || d?.failCode || taskId}`)
      console.log(`[pollImageTask] state="${s}", 경과=${Math.round((Date.now() - start) / 1000)}s`)
    }
    throw new Error('kie.ai 이미지 작업 시간 초과 (6분)')
  }

  // ─── VIDEO GENERATION ───
  async function runVideoGeneration(step2Output: string, referenceImages: string[], ratio: string, t0: number, model: string = 'veo3_fast') {
    const videoPrompt = extractVideoPrompt(step2Output)
    const imageUrls = referenceImages.slice(0, 2)

    console.log('[runVideoGeneration] model:', model)
    console.log('[runVideoGeneration] imageUrls:', imageUrls)
    console.log('[runVideoGeneration] prompt:', videoPrompt.slice(0, 200))

    const requestBody = {
      prompt: videoPrompt,
      model,
      aspect_ratio: ratio,
      resolution: '1080p',
      enableTranslation: false,
      ...(imageUrls.length >= 2 && {
        imageUrls: imageUrls.slice(0, 2),
        generationType: 'FIRST_AND_LAST_FRAMES_2_VIDEO',
      }),
      ...(imageUrls.length === 1 && {
        imageUrls,
        generationType: 'REFERENCE_2_VIDEO',
      }),
    }
    console.log('[runVideoGeneration] 최종 요청 body:', JSON.stringify(requestBody))

    const taskRes = await fetch('/api/kie/video/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }).then(r => r.json())
    console.log('[runVideoGeneration] taskRes:', JSON.stringify(taskRes))

    const taskId = taskRes?.data?.taskId
    if (!taskId) throw new Error(`kie.ai 영상: taskId를 받지 못했습니다. 응답: ${JSON.stringify(taskRes)}`)
    return pollVideoTask(taskId, t0)
  }

  async function pollVideoTask(taskId: string, t0: number, maxWaitMs = 480000) {
    const start = Date.now()
    await sleep(10000)
    while (Date.now() - start < maxWaitMs) {
      await sleep(5000)
      const res: any = await fetch(`/api/kie/video/poll?taskId=${taskId}`).then(r => r.json())
      console.log('[pollVideoTask]', JSON.stringify(res))
      const flag = res?.data?.successFlag
      const response = res?.data?.response

      if (flag === 1 || flag === 0) {
        // resultUrls 우선, 없으면 originUrls 폴백 (kie.ai가 successFlag 업데이트 전에 originUrls를 먼저 채우는 경우 대응)
        let urls = response?.resultUrls
        let urlArr = urls
        if (typeof urls === 'string') { try { urlArr = JSON.parse(urls) } catch { urlArr = [urls] } }
        let url = Array.isArray(urlArr) ? urlArr[0] : urlArr

        if (!url) {
          const origins = response?.originUrls
          url = Array.isArray(origins) ? origins[0] : origins
        }

        if (flag === 1 && !url) throw new Error('kie.ai 영상: resultUrls가 비어 있습니다.')
        if (url) return url as string
      }

      if (flag === 2 || flag === 3) {
        const d = res?.data
        const detail = d?.failMsg || d?.failCode || response?.errorMessage || JSON.stringify(d)
        throw new Error(`kie.ai 영상 생성 실패\n${detail}`)
      }
    }
    throw new Error('kie.ai 영상 작업 시간 초과 (8분)')
  }

  // ─── HELPERS ───
  function parseStep3Prompts(text: string): ImagePrompt[] {
    const prompts: ImagePrompt[] = []
    const fallback = 'CGI, 3D render, illustration, watermark, text, plastic skin, distorted face, extra limbs'
    const s1 = text.match(/\[SCENE 1\]\s*\nPrompt:\s*(.+?)(?:\nNegative Prompt:\s*(.+?))?(?:\nAspect Ratio:|$)/s)
    const s2 = text.match(/\[SCENE 2\]\s*\nPrompt:\s*(.+?)(?:\nNegative Prompt:\s*(.+?))?(?:\nAspect Ratio:|$)/s)
    if (s1) prompts.push({ prompt: s1[1].trim(), negativePrompt: s1[2]?.trim() || fallback })
    if (s2) prompts.push({ prompt: s2[1].trim(), negativePrompt: s2[2]?.trim() || fallback })
    if (prompts.length === 0) prompts.push({ prompt: text.substring(0, 500), negativePrompt: fallback })
    return prompts
  }

  function extractVideoPrompt(step2Text: string) {
    const charRefMatch = step2Text.match(/Character Reference:\s*(.+)/)
    const charRef = charRefMatch ? charRefMatch[1].trim() : ''

    const s1 = step2Text.match(/Scene 1\s*\|[^\n]*\n([\s\S]*?)(?:\n---|\nScene 2|$)/)
    const s2 = step2Text.match(/Scene 2\s*\|[^\n]*\n([\s\S]*?)(?:\n---|\nStyle:|$)/)

    function cleanScene(raw: string): string {
      return raw
        .replace(/^Light:.*$/m, '').replace(/^Focus:.*$/m, '').replace(/^Pace:.*$/m, '').trim()
        // "same person as Character Reference" → 실제 charRef 값으로 치환
        .replace(/same person as Character Reference/gi, charRef || '')
        .split('\n').filter(l => l.trim()).join(', ')
    }

    let scenePart = ''
    if (s1) scenePart = cleanScene(s1[1])
    if (s2) {
      const s2clean = cleanScene(s2[1])
      if (s2clean) scenePart += ', cut to ' + s2clean
    }

    // charRef는 scenePart 앞에 한 번만 붙임 (덮어쓰기 버그 수정)
    let prompt = charRef ? `Character: ${charRef}. ${scenePart}` : scenePart

    // Color 블록 제거 — "skin tones", "deep black" 등이 Google 오디오 필터 트리거
    prompt = prompt.replace(/,\s*Color:[^,]+(?:,(?!\s*cut\s+to)[^,]+)*/gi, '')

    // 따옴표 텍스트 / text·label·logo·brand·inscription 묘사 제거
    prompt = prompt
      .replace(/"[^"]{1,80}"/g, '')
      .replace(/\b(large|small|big|smaller|tiny|bold)?\s*(black|white|bold|visible|central|printed|front|back|side)?\s*(text|label|logo|brand|inscription|characters)\b[^,]*/gi, '')

    // 연속 대문자 브랜드명 제거 (예: VAL HYO TOMATO, VALHYO 등)
    prompt = prompt
      .replace(/\b[A-Z]{2,}(?:\s+[A-Z0-9]{2,}){1,4}\b/g, '')
      .replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').trim()

    return prompt || step2Text.substring(0, 800)
  }

  function resetToInput() {
    setImages([])
    setTopics([])
    setSelectedTopic(null)
    setTopicsVisible(false)
    setTopicsLoading(false)
    setDescription('')
    setVideoUrl('')
    setGenStep2Output('')
    setGenStep3Output('')
    setGenReferenceImages([])
    setGenVideoPrompt('')
    setSteps(DEFAULT_STEPS.map(s => ({ ...s })))
    setShowImageHint(false)
    setShowTopicHint(false)
    setScreen('input')
  }

  function handleDelete() {
    if (window.confirm('영상을 삭제하시겠습니까?')) resetToInput()
  }

  return (
    <>
      {/* Settings button always visible on input screen */}
      {screen === 'input' && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 50 }}>
          <button className="btn-settings" onClick={() => setSettingsOpen(true)}>⚙ API 설정</button>
        </div>
      )}

      {screen === 'input' && (
        <InputScreen
          ratio={ratio}
          images={images}
          description={description}
          topics={topics}
          selectedTopicId={selectedTopic?.id ?? null}
          topicsLoading={topicsLoading}
          topicsVisible={topicsVisible}
          onRatioChange={setRatio}
          onImagesAdd={addImages}
          onImageRemove={removeImage}
          onDescriptionChange={setDescription}
          onRecommend={runStep1}
          onTopicSelect={t => { setSelectedTopic(t); setShowTopicHint(false) }}
          onGenerate={startGeneration}
          generateEnabled={images.length > 0 && (description.trim().length > 0 || selectedTopic !== null)}
          showImageHint={showImageHint}
          showTopicHint={showTopicHint}
        />
      )}

      {screen === 'processing' && (
        <ProcessingScreen username={config.username} steps={steps} />
      )}

      {screen === 'result' && (
        <ResultScreen
          username={config.username}
          elapsed={elapsed}
          videoUrl={videoUrl}
          referenceImages={genReferenceImages}
          step2Output={genStep2Output}
          step3Output={genStep3Output}
          videoPrompt={genVideoPrompt}
          onNew={resetToInput}
          onDelete={handleDelete}
        />
      )}

      <SettingsModal
        open={settingsOpen}
        config={config}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      <ErrorModal
        open={error.visible}
        step={error.step}
        message={error.message}
        onRetry={() => { setError(e => ({ ...e, visible: false })); resetToInput() }}
        onClose={() => setError(e => ({ ...e, visible: false }))}
      />

      <Toast message={toast.message} visible={toast.visible} />
    </>
  )
}
