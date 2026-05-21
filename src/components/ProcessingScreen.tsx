'use client'
import type { StepInfo } from '../types'

interface ProcessingScreenProps {
  username: string
  steps: StepInfo[]
}

export default function ProcessingScreen({ username, steps }: ProcessingScreenProps) {
  return (
    <div className="screen active" id="screen-processing">
      <div className="processing-card">
        <h2><span className="username">{username}</span>님의 영상을<br />만들고 있어요.</h2>
        <p className="processing-time">예상 소요시간 · <span>30초~3분</span></p>

        <div className="steps-list">
          {steps.map((step, i) => (
            <div className="step-item" key={i}>
              <div className={`step-icon ${step.status}`}>
                {step.status === 'done' ? '✓' : step.status === 'pending' ? '—' : ''}
              </div>
              <div className="step-text">
                <div className="step-name">{step.name}</div>
                <div className="step-desc">{step.desc}</div>
              </div>
              {step.time && <div className="step-time">{step.time}</div>}
            </div>
          ))}
        </div>

        <p className="processing-note">영상은 3개까지 다운로드 할 수 있으며 3일 이후에는 영상이 삭제됩니다.</p>
      </div>
    </div>
  )
}
