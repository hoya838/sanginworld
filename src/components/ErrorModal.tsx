'use client'

const STEP_LABELS: Record<string, string> = {
  step1b: 'STEP 1B — 주제 자동 생성',
  step2:  'STEP 2 — 스토리보드 생성',
  step3:  'STEP 3 — 이미지 프롬프트 생성',
  image:  'kie.ai — 이미지 생성',
  video:  'kie.ai — 영상 생성',
  unknown: '알 수 없는 단계',
}

const STEP_HINTS: Record<string, string> = {
  step1b: '• Gemini API 키가 올바른지 확인해주세요.\n• 이미지가 정상적으로 업로드됐는지 확인해주세요.',
  step2:  '• Gemini API 키가 올바른지 확인해주세요.\n• 이미지 파일 형식이 JPEG / PNG / WebP인지 확인해주세요.',
  step3:  '• Gemini API 키가 올바른지 확인해주세요.',
  image:  '• kie.ai API 키와 크레딧 잔액을 확인해주세요.\n• "시간 초과" 오류라면 서버 부하로 인한 지연일 수 있습니다.',
  video:  '• kie.ai API 키와 크레딧 잔액을 확인해주세요.\n• Veo 3.1 Fast 생성은 최대 5분 소요됩니다.',
  unknown: '• 브라우저 콘솔(F12 → Console)에서 상세 오류를 확인해주세요.',
}

interface ErrorModalProps {
  open: boolean
  step: string
  message: string
  onRetry: () => void
  onClose: () => void
}

export default function ErrorModal({ open, step, message, onRetry, onClose }: ErrorModalProps) {
  if (!open) return null

  const label = STEP_LABELS[step] || STEP_LABELS.unknown
  const hint = STEP_HINTS[step] || STEP_HINTS.unknown

  return (
    <div className="modal-overlay open">
      <div className="modal modal-error-inner">
        <div className="error-title">오류가 발생했습니다</div>
        <div className="error-step-badge">{label}</div>
        <div className="error-body">{message}</div>
        <div className="error-hint" style={{ whiteSpace: 'pre-wrap' }}>{hint}</div>
        <button className="btn-error-retry" onClick={onRetry}>↺ 처음부터 다시 시도</button>
        <button className="btn-error-close" onClick={onClose}>닫기</button>
      </div>
    </div>
  )
}
