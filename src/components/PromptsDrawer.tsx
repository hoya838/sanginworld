'use client'
import { useState } from 'react'

type Tab = 'storyboard' | 'image' | 'video'

const TAB_LABELS: Record<Tab, string> = {
  storyboard: '스토리보드',
  image: '이미지 프롬프트',
  video: '영상 프롬프트',
}

interface PromptsDrawerProps {
  open: boolean
  onClose: () => void
  step2Output: string
  step3Output: string
  videoPrompt: string
}

export default function PromptsDrawer({ open, onClose, step2Output, step3Output, videoPrompt }: PromptsDrawerProps) {
  const [tab, setTab] = useState<Tab>('storyboard')
  const [copied, setCopied] = useState(false)

  const contents: Record<Tab, string> = {
    storyboard: step2Output,
    image: step3Output,
    video: videoPrompt,
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(contents[tab])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div className={`drawer-overlay${open ? ' open' : ''}`} onClick={onClose} />
      <div className={`drawer${open ? ' open' : ''}`}>
        <div className="drawer-header">
          <span style={{ fontSize: 15, fontWeight: 700 }}>생성 프롬프트</span>
          <button className="drawer-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-tabs">
          {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
            <button
              key={t}
              className={`drawer-tab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="drawer-content">
          <button className="btn-copy" onClick={handleCopy}>
            {copied ? '✓ 복사됨' : '📋 복사'}
          </button>
          <div className="prompt-text">
            {contents[tab] || '(생성된 내용 없음)'}
          </div>
        </div>
      </div>
    </>
  )
}
