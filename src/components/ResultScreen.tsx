'use client'
import { useState } from 'react'
import PromptsDrawer from './PromptsDrawer'

interface ResultScreenProps {
  username: string
  elapsed: number
  videoUrl: string
  referenceImages: string[]
  step2Output: string
  step3Output: string
  videoPrompt: string
  onNew: () => void
  onDelete: () => void
}

export default function ResultScreen({
  username, elapsed, videoUrl, referenceImages,
  step2Output, step3Output, videoPrompt,
  onNew, onDelete,
}: ResultScreenProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  function makeDownloadUrl(url: string, filename: string) {
    return `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`
  }

  return (
    <div className="screen active" id="screen-result">
      <div className="result-card">
        <h2><span className="username">{username}</span>님의 영상을<br />완성했어요.</h2>
        <p className="result-elapsed">소요시간 · {elapsed}초</p>

        <div className="video-wrapper">
          <video src={videoUrl} controls playsInline />
        </div>

        <div className="result-actions">
          <a
            className="btn-download"
            href={makeDownloadUrl(videoUrl, '영상.mp4')}
            download="영상.mp4"
          >
            ↓ 영상 다운로드
          </a>

          {referenceImages.length > 0 && (
            <div className="ref-images-section">
              <p className="ref-images-label">생성된 레퍼런스 이미지</p>
              <div className="ref-images-grid">
                {referenceImages.map((url, i) => (
                  <div className="ref-image-item" key={i}>
                    <img src={url} alt={`레퍼런스 이미지 ${i + 1}`} />
                    <a
                      className="ref-image-download"
                      href={makeDownloadUrl(url, `이미지_${i + 1}.jpg`)}
                      download={`이미지_${i + 1}.jpg`}
                    >
                      ↓
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button className="btn-prompt-view" onClick={() => setDrawerOpen(true)}>
            생성 프롬프트 보기
          </button>

          <div className="result-secondary">
            <button className="btn-secondary btn-new" onClick={onNew}>↺ 새로 만들기</button>
            <button className="btn-secondary btn-delete" onClick={onDelete}>🗑 삭제</button>
          </div>
        </div>
      </div>

      <PromptsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        step2Output={step2Output}
        step3Output={step3Output}
        videoPrompt={videoPrompt}
      />
    </div>
  )
}
