# 시스템 구조 문서

> sanginweb 영상 생성 서비스의 전체 흐름, 사용 모델, 프롬프트, 데이터 구조를 정리한 문서입니다.

---

## 전체 파이프라인 요약

```
[사용자 입력]
  이미지(1~2장) + 설명 텍스트 (또는 주제 선택)
        ↓
[STEP 1 / 1B]  주제 분석 — Gemini Flash Lite
        ↓
[STEP 2]  스토리보드 생성 — Gemini Flash
        ↓
[STEP 3]  이미지 프롬프트 생성 — Gemini Flash
        ↓
[IMAGE]  씬 이미지 2장 생성 — Nano Banana 2 (kie.ai)
        ↓
[VIDEO]  영상 생성 — Veo 3.1 Fast → 실패 시 재시도 → 실패 시 Veo 3.1 Lite (kie.ai)
        ↓
[결과 화면]  영상 URL 출력
```

---

## 모델 목록

| 역할 | 모델 ID | 설정 키 |
|---|---|---|
| 주제 분석 (Step 1 / 1B) | `gemini-2.5-flash` | `MODEL_LITE` |
| 스토리보드 생성 (Step 2) | `gemini-2.5-flash` | `MODEL_FLASH` |
| 이미지 프롬프트 생성 (Step 3) | `gemini-2.5-flash` | `MODEL_FLASH` |
| 씬 이미지 생성 | `nano-banana-2` | `IMAGE_MODEL` |
| 영상 생성 (1차 / 재시도) | `veo3_fast` | 코드 하드코딩 |
| 영상 생성 (2차 폴백) | `veo3_lite` | 코드 하드코딩 |

---

## 환경변수 / 설정값

### `config/api.json` (로컬 개발)

```json
{
  "geminiKey": "...",
  "kieKey": "...",
  "username": "사용자",
  "modelLite": "gemini-2.5-flash",
  "modelFlash": "gemini-2.5-flash",
  "imageModel": "nano-banana-2"
}
```

### Vercel 환경변수 (배포)

| 환경변수 키 | 값 예시 | 설명 |
|---|---|---|
| `GEMINI_KEY` | `AIza...` | Google AI Studio API 키 |
| `KIE_KEY` | `...` | kie.ai API 키 |
| `APP_USERNAME` | `홍길동` | UI 표시용 사용자명 |
| `MODEL_LITE` | `gemini-2.5-flash` | Step 1 모델 (생략 가능, 기본값 있음) |
| `MODEL_FLASH` | `gemini-2.5-flash` | Step 2/3 모델 (생략 가능) |
| `IMAGE_MODEL` | `nano-banana-2` | 이미지 생성 모델 (반드시 명시) |

> Vercel에서 환경변수 수정 후에는 반드시 **Redeploy** 실행 필요.

---

## TypeScript 타입 정의 (`src/types.ts`)

### `AppConfig` — 앱 설정

| 필드 | 타입 | 설명 |
|---|---|---|
| `geminiKey` | `string` | Gemini API 키 |
| `kieKey` | `string` | kie.ai API 키 |
| `username` | `string` | UI 표시 사용자명 |
| `modelLite` | `string` | Step 1 Gemini 모델 ID |
| `modelFlash` | `string` | Step 2/3 Gemini 모델 ID |
| `imageModel` | `string` | 이미지 생성 모델 ID |

### `ImageItem` — 사용자 업로드 이미지

| 필드 | 타입 | 설명 |
|---|---|---|
| `file` | `File` | 원본 File 객체 |
| `dataUrl` | `string` | `data:image/...;base64,...` 전체 문자열 |
| `base64` | `string` | base64 데이터 부분만 (dataUrl에서 `,` 이후) |
| `mimeType` | `string` | `image/jpeg`, `image/png` 등 |

### `Topic` — 주제 데이터

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | `number` | 주제 식별자 (1~3) |
| `title` | `string` | 주제 제목 |
| `description` | `string` | 주제 설명 |
| `duration` | `string` | 영상 길이 (항상 `"8s"`) |
| `hook` | `string` | 첫 장면 훅 설명 |
| `tone` | `string[]` | 톤 키워드 배열 |
| `platform` | `string` | 플랫폼 (`reels` / `tiktok` / `shorts`) |
| `platform_reason` | `string?` | 플랫폼 선택 이유 |
| `key_scenes` | `string[]?` | 핵심 씬 설명 목록 |
| `story_arc` | `StoryArc?` | 3단계 스토리 구조 |
| `timeline` | `Record<string,string>?` | 시간 구간별 타임라인 |
| `emotional_journey` | `string?` | 감정 흐름 설명 |
| `narrative_hook` | `string?` | 서사적 훅 |
| `step2_input` | `string?` | Step 2에 그대로 전달할 텍스트 (Step 1B 전용) |

### `StoryArc` — 3단 스토리

| 필드 | 타입 | 설명 |
|---|---|---|
| `opening` | `string` | 오프닝 |
| `build` | `string` | 빌드업 |
| `payoff` | `string` | 마무리/반전 |

### `ImagePrompt` — 이미지 생성 프롬프트 1건

| 필드 | 타입 | 설명 |
|---|---|---|
| `prompt` | `string` | 영문 생성 프롬프트 |
| `negativePrompt` | `string` | 네거티브 프롬프트 |

### `Prompts` — Step별 프롬프트 텍스트 묶음

| 필드 | 타입 | 설명 |
|---|---|---|
| `step1` | `string` | 주제 추천 프롬프트 |
| `step1b` | `string` | 설명→주제 변환 프롬프트 |
| `step2` | `string` | 스토리보드 생성 프롬프트 |
| `step3` | `string` | 이미지 프롬프트 생성 프롬프트 |

### `StepInfo` — 처리 화면 단계 상태

| 필드 | 타입 | 설명 |
|---|---|---|
| `name` | `string` | 단계명 |
| `desc` | `string` | 현재 상태 설명 텍스트 |
| `status` | `'pending' \| 'active' \| 'done'` | 진행 상태 |
| `time` | `string?` | 완료 시 경과 시간 표시 |

---

## 단계별 상세

---

### STEP 1 — 주제 추천 (선택 단계)

**트리거**: 사용자가 "주제 추천" 버튼 클릭

**모델**: `gemini-2.5-flash`

**입력**
- 이미지: 1~2장 (base64 inlineData)
- 텍스트: `step1` 시스템 프롬프트 + `mode: detail` + 사용자 설명 (있을 경우 `[사용자 설명]\n{text}`)

**출력 JSON 구조**
```json
{
  "mode": "detail",
  "category": "...",
  "topics": [
    {
      "id": 1,
      "title": "주제 제목",
      "description": "설명",
      "duration": "8s",
      "hook": "훅 설명",
      "tone": ["키워드1", "키워드2"],
      "platform": "reels",
      "platform_reason": "선택 이유",
      "key_scenes": ["씬1", "씬2", "씬3"],
      "story_arc": { "opening": "", "build": "", "payoff": "" },
      "timeline": { "opening_sec": "0~2s", "build_sec": "2~5s", "payoff_sec": "5~8s" },
      "emotional_journey": "감정 흐름",
      "narrative_hook": "서사 훅"
    }
  ]
}
```
> `topics`는 반드시 3개, 감성형·정보형·서사형 1개씩

---

### STEP 1B — 설명→주제 자동 변환

**트리거**: 사용자가 주제 선택 없이 "영상 생성" 클릭 (이미지 + 설명만 있는 경우)

**모델**: `gemini-2.5-flash`

**입력**
- 이미지: 1~2장
- 텍스트: `step1b` 시스템 프롬프트 + `[사용자 설명]\n{text}\n[영상 비율]\n{ratio}`

**출력 JSON 구조**
```json
{
  "mode": "detail",
  "category": "...",
  "topics": [
    {
      "id": 1,
      "step2_input": "- 선택 주제: ... / story_arc: ... / emotional_journey: ...\n- 영상 비율: 16:9\n- 총 길이: 8s\n- 첫 프레임 이미지: 첨부",
      "title": "...",
      "...": "..."
    }
  ]
}
```
> `topics`는 1개만 반환. `step2_input`에 Step 2 입력 텍스트가 미리 완성되어 있음.

---

### STEP 2 — 스토리보드 생성

**모델**: `gemini-2.5-flash`

**입력**
- 이미지: 원본 1~2장 (base64)
- 텍스트: `step2` 시스템 프롬프트 + `step2_input` 텍스트

`step2_input` 기본 조합 (Step 1에서 선택한 경우):
```
- 선택 주제: {title} / {description} / story_arc: {opening} → {build} → {payoff} / emotional_journey: {emotional_journey}
- 영상 비율: 16:9
- 총 길이: 8s
- 첫 프레임 이미지: 첨부
```

**출력 텍스트 형식** (영문, 속성 나열형)
```
Ratio: 16:9
Duration: 8s
Hook Type: Visual Hook
Story: ...
Character Reference: {의상 색상, 헤어스타일, 소품}

---

Scene 1 | Hook | 0s~4s | static camera | cut to
{영문 프롬프트 태그들}
Light: ...
Focus: ...
Pace: ...

---

Scene 2 | Payoff | 4s~8s | slow push-in | cut to new scene
{영문 프롬프트 태그들}
Light: ...
Focus: ...
Pace: ...

---

Style: ...
Negative: ...
BGM: ...

---

(선택적)
Narration: (한국어)
[0s~Xs] 한국어 대본

---

[STORYBOARD → STEP 3]
Scene 1 (Veo first frame): ...
Scene 2 (Veo last frame): ...
Style Reference: ...
Ratio: 16:9
```

> `[STORYBOARD → STEP 3]` 블록은 Step 3과 Veo 영상 프롬프트 추출에 사용됨.

---

### STEP 3 — 이미지 프롬프트 생성

**모델**: `gemini-2.5-flash`

**입력**
- 이미지: 원본 1~2장 (base64)
- 텍스트: `step3` 시스템 프롬프트 + Step 2 출력에서 추출한 `[STORYBOARD → STEP 3]` 블록

**출력 텍스트 형식**
```
[SCENE 1]
Prompt: shot on Sony A7IV, 35mm f/1.8, ..., RAW photo, fine grain detail, ...
Negative Prompt: CGI, 3D render, illustration, watermark, text, plastic skin, distorted face, extra limbs, AI-generated look
Aspect Ratio: 16:9

[SCENE 2]
Prompt: ...
Negative Prompt: ...
Aspect Ratio: 16:9
```

**파싱 결과**: `ImagePrompt[]` 배열 (최대 2개)

---

### IMAGE — 씬 이미지 생성

**모델**: `nano-banana-2` (kie.ai)

**API 엔드포인트**: `POST https://api.kie.ai/api/v1/jobs/createTask`

**요청 body**
```json
{
  "model": "nano-banana-2",
  "input": {
    "prompt": "...",
    "aspect_ratio": "16:9",
    "resolution": "2K",
    "output_format": "jpg",
    "image_input": ["https://...원본이미지URL"]
  }
}
```

**이미지 참조 전략**

| 원본 이미지 수 | 생성 방식 | Scene 1 참조 | Scene 2 참조 |
|---|---|---|---|
| 2장 | 병렬 생성 | 원본 이미지 1 | 원본 이미지 2 |
| 1장 | 순차 생성 | 원본 이미지 1 | Scene 1 생성 결과 |
| 0장 | 순차 생성 | 없음 | Scene 1 생성 결과 |

**폴링 API**: `GET /api/v1/jobs/recordInfo?taskId={taskId}`

**폴링 응답 필드**

| 필드 | 타입 | 설명 |
|---|---|---|
| `data.state` | `string` | `"pending"` / `"processing"` / `"success"` / `"fail"` |
| `data.resultJson` | `string` | JSON 문자열 → `resultUrls[0]` 이 이미지 URL |
| `data.failMsg` | `string?` | 실패 메시지 |
| `data.failCode` | `string?` | 실패 코드 |

**타임아웃**: 최대 6분 (360,000ms), 2초 간격 폴링

---

### VIDEO — 영상 생성

**모델**: `veo3_fast` → 실패 시 `veo3_fast` 재시도(10초 후) → 실패 시 `veo3_lite`(5초 후)

**API 엔드포인트**: `POST https://api.kie.ai/api/v1/veo/generate`

**요청 body**
```json
{
  "prompt": "...",
  "model": "veo3_fast",
  "aspect_ratio": "16:9",
  "resolution": "1080p",
  "enableTranslation": false,
  "imageUrls": ["씬이미지1URL", "씬이미지2URL"],
  "generationType": "FIRST_AND_LAST_FRAMES_2_VIDEO"
}
```

**generationType 분기**

| 참조 이미지 수 | generationType | 설명 |
|---|---|---|
| 2장 | `FIRST_AND_LAST_FRAMES_2_VIDEO` | 이미지를 영상 첫/마지막 프레임으로 고정 |
| 1장 | `REFERENCE_2_VIDEO` | 이미지를 스타일 참조용으로 사용 |
| 0장 | (imageUrls 없음) | 텍스트 프롬프트만으로 생성 |

**폴링 API**: `GET /api/v1/veo/record-info?taskId={taskId}`

**폴링 응답 필드**

| 필드 | 타입 | 설명 |
|---|---|---|
| `data.successFlag` | `number` | `0` = 진행 중, `1` = 성공, `2` / `3` = 실패 |
| `data.response.resultUrls` | `string \| string[]` | 영상 URL (문자열 또는 JSON 배열 문자열) |
| `data.failMsg` | `string?` | 실패 메시지 |

**타임아웃**: 최대 5분 (300,000ms), 초기 10초 대기 후 5초 간격 폴링

---

## 영상 프롬프트 추출 로직 (`extractVideoPrompt`)

Step 2 출력 텍스트에서 Veo에 전달할 프롬프트를 추출하며, Google 오디오 안전 필터를 통과하기 위해 다음 항목을 자동 제거합니다:

| 제거 대상 | 이유 |
|---|---|
| `Light: ...` / `Focus: ...` / `Pace: ...` 줄 | Veo 불필요 속성 |
| `Color: ...` 블록 | `skin tones`, `deep black` 등이 오디오 필터 트리거 |
| `"따옴표로 감싼 텍스트"` | 브랜드명 등이 오디오 필터 트리거 |
| `large black text` 등 텍스트 묘사 | 오디오 필터 트리거 |
| 한국어 나레이션 블록 | 오디오 필터 트리거 |

---

## API 라우트 목록

| 경로 | 메서드 | 역할 |
|---|---|---|
| `/api/config` | GET | 설정값 반환 (`AppConfig`) |
| `/api/config` | POST | 설정값 저장 (로컬만 가능) |
| `/api/prompts` | GET | Step 1/1B/2/3 프롬프트 텍스트 반환 |
| `/api/kie/upload` | POST | base64 이미지를 kie.ai에 업로드 → URL 반환 |
| `/api/kie/image/create` | POST | kie.ai 이미지 생성 작업 시작 → `taskId` 반환 |
| `/api/kie/image/poll` | GET | 이미지 작업 상태 조회 |
| `/api/kie/video/create` | POST | kie.ai Veo 영상 생성 작업 시작 → `taskId` 반환 |
| `/api/kie/video/poll` | GET | 영상 작업 상태 조회 |
| `/api/download` | GET | 영상 URL 프록시 다운로드 |

---

## 이미지 업로드 흐름 (`/api/kie/upload`)

**외부 API**: `POST https://kieai.redpandaai.co/api/file-base64-upload`

**요청 body**
```json
{
  "base64Data": "data:image/jpeg;base64,...",
  "uploadPath": "sanginweb",
  "fileName": "ref_1716300000000.jpg"
}
```

**응답**
```json
{
  "data": {
    "downloadUrl": "https://tempfile.aiquickdraw.com/..."
  }
}
```

---

## 프롬프트 파일 위치

| 파일 | Step | 모델 |
|---|---|---|
| `config/prompts/step1.json` | 주제 추천 | Gemini Flash Lite |
| `config/prompts/step1b.json` | 설명→주제 변환 | Gemini Flash Lite |
| `config/prompts/step2.json` | 스토리보드 생성 | Gemini Flash |
| `config/prompts/step3.json` | 이미지 프롬프트 생성 | Gemini Flash |

---

## 화면 상태 전환

```
input → processing → result
          ↑                ↓
          └─── resetToInput() ←─── 새 영상 만들기 / 삭제
```

| 상태 | 컴포넌트 |
|---|---|
| `'input'` | `InputScreen` |
| `'processing'` | `ProcessingScreen` |
| `'result'` | `ResultScreen` |
