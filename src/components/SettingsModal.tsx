'use client'
import { useState, useEffect } from 'react'
import type { AppConfig } from '../types'

interface SettingsModalProps {
  open: boolean
  config: AppConfig
  onClose: () => void
  onSave: (config: AppConfig) => void
}

export default function SettingsModal({ open, config, onClose, onSave }: SettingsModalProps) {
  const [form, setForm] = useState<AppConfig>(config)

  useEffect(() => {
    setForm(config)
  }, [config, open])

  function handleSave() {
    onSave(form)
  }

  if (!open) return null

  return (
    <div className="modal-overlay open">
      <div className="modal">
        <h3>⚙️ API 키 설정</h3>

        <label htmlFor="gemini-key">Google AI Studio API Key (Gemini)</label>
        <input
          type="password" id="gemini-key"
          placeholder="AIza..."
          value={form.geminiKey}
          onChange={e => setForm({ ...form, geminiKey: e.target.value })}
        />
        <p className="modal-hint">STEP 1·1B·2·3 에 사용됩니다 (gemini-2.5-flash / flash-lite)</p>

        <label htmlFor="kie-key">kie.ai API Key</label>
        <input
          type="password" id="kie-key"
          placeholder="kie_..."
          value={form.kieKey}
          onChange={e => setForm({ ...form, kieKey: e.target.value })}
        />
        <p className="modal-hint">이미지 (Nano Banana 2) + 영상 (Veo 3.1 Fast) 생성에 사용됩니다</p>

        <label htmlFor="username">사용자 이름 (처리 화면 표시용)</label>
        <input
          type="text" id="username"
          placeholder="김상인"
          value={form.username}
          onChange={e => setForm({ ...form, username: e.target.value })}
        />

        <label htmlFor="image-model">이미지 생성 모델 (STEP 3)</label>
        <select
          id="image-model"
          value={form.imageModel}
          onChange={e => setForm({ ...form, imageModel: e.target.value })}
        >
          <option value="nano-banana-2">Nano Banana 2 — 이미지→이미지</option>
          <option value="gpt-image-2-image-to-image">GPT Image 2 — 이미지→이미지 (2K)</option>
          <option value="google/imagen4-fast">Google Imagen 4 Fast — 텍스트→이미지</option>
        </select>

        <label htmlFor="model-lite">Gemini 모델 — STEP 1·1B (Flash-Lite)</label>
        <input
          type="text" id="model-lite"
          placeholder="gemini-2.5-flash-lite-preview-06-17"
          value={form.modelLite}
          onChange={e => setForm({ ...form, modelLite: e.target.value })}
        />

        <label htmlFor="model-flash">Gemini 모델 — STEP 2·3 (Flash)</label>
        <input
          type="text" id="model-flash"
          placeholder="gemini-2.5-flash-preview-05-20"
          value={form.modelFlash}
          onChange={e => setForm({ ...form, modelFlash: e.target.value })}
        />

        <div className="modal-actions">
          <button className="btn-modal-cancel" onClick={onClose}>취소</button>
          <button className="btn-modal-save" onClick={handleSave}>저장</button>
        </div>
      </div>
    </div>
  )
}
