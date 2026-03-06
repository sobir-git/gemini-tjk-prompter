export const STATUS = {
  IDLE: 'idle',
  RECORDING: 'recording',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error',
} as const

export type AppStatus = (typeof STATUS)[keyof typeof STATUS]

export interface ModelResult {
  model: string
  optimized_prompt: string
  error?: string
  time_ms: number
}

export interface PromptResponse {
  results: ModelResult[]
  server_time_ms: number
}

export interface AvailableModel {
  id: string
  label: string
}

export const AVAILABLE_MODELS: AvailableModel[] = [
  { id: 'gemini-2.5-flash',              label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite',         label: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-2.5-pro',                label: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.0-flash',              label: 'Gemini 2.0 Flash' },
  { id: 'gemini-2.0-flash-001',          label: 'Gemini 2.0 Flash 001' },
  { id: 'gemini-2.0-flash-lite',         label: 'Gemini 2.0 Flash Lite' },
  { id: 'gemini-2.0-flash-lite-001',     label: 'Gemini 2.0 Flash Lite 001' },
  { id: 'gemini-flash-latest',           label: 'Gemini Flash Latest' },
  { id: 'gemini-flash-lite-latest',      label: 'Gemini Flash Lite Latest' },
  { id: 'gemini-pro-latest',             label: 'Gemini Pro Latest' },
  { id: 'gemini-3-flash-preview',        label: 'Gemini 3 Flash Preview' },
  { id: 'gemini-3-pro-preview',          label: 'Gemini 3 Pro Preview' },
  { id: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite Preview' },
  { id: 'gemini-3.1-pro-preview',        label: 'Gemini 3.1 Pro Preview' },
  { id: 'gemma-3-1b-it',                 label: 'Gemma 3 1B IT' },
  { id: 'gemma-3-4b-it',                 label: 'Gemma 3 4B IT' },
  { id: 'gemma-3-12b-it',                label: 'Gemma 3 12B IT' },
  { id: 'gemma-3-27b-it',                label: 'Gemma 3 27B IT' },
  { id: 'gemma-3n-e2b-it',               label: 'Gemma 3n E2B IT' },
  { id: 'gemma-3n-e4b-it',               label: 'Gemma 3n E4B IT' },
]
