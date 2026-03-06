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
  { id: 'gemini-3-flash-preview',        label: 'Gemini 3 Flash Preview' },
  { id: 'gemini-3-pro-preview',          label: 'Gemini 3 Pro Preview' },
  { id: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite Preview' },
  { id: 'gemini-3.1-pro-preview',        label: 'Gemini 3.1 Pro Preview' },
]

export type OutputLanguage = 'english' | 'russian' | 'tajik'

export interface LanguageOption {
  id: OutputLanguage
  label: string
  nativeLabel: string
}

export const AVAILABLE_LANGUAGES: LanguageOption[] = [
  { id: 'english', label: 'English', nativeLabel: 'English' },
  { id: 'russian', label: 'Russian', nativeLabel: 'Русский' },
  { id: 'tajik', label: 'Tajik', nativeLabel: 'Тоҷикӣ' },
]
