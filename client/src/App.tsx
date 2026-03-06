import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff } from 'lucide-react'
import ModelSelector from './components/ModelSelector'
import ResultsPanel from './components/ResultsPanel'
import { useAudioRecorder } from './hooks/useAudioRecorder'
import { STATUS, AppStatus, ModelResult, PromptResponse } from './types'

export default function App() {
  const [status, setStatus] = useState<AppStatus>(STATUS.IDLE)
  const [results, setResults] = useState<ModelResult[]>([])
  const [error, setError] = useState('')
  const [currentDate, setCurrentDate] = useState('')
  const [advancedMode, setAdvancedMode] = useState(false)
  const [selectedModels, setSelectedModels] = useState<string[]>(() => {
    const saved = localStorage.getItem('selectedModels')
    return saved ? JSON.parse(saved) : ['gemini-2.0-flash']
  })
  const [, setAnalyser] = useState<AnalyserNode | null>(null)

  const selectedModelsRef = useRef(selectedModels)
  useEffect(() => { 
    selectedModelsRef.current = selectedModels 
    localStorage.setItem('selectedModels', JSON.stringify(selectedModels))
  }, [selectedModels])

  useEffect(() => {
    const date = new Date();
    const months = [
      'Январ', 'Феврал', 'Март', 'Апрел', 'Май', 'Июн',
      'Июл', 'Август', 'Сентябр', 'Октябр', 'Ноябр', 'Декабр'
    ];
    const tajikDate = `${date.getDate()} ${months[date.getMonth()]}и ${date.getFullYear()}`;
    setCurrentDate(tajikDate);
  }, [])

  const toggleModel = useCallback((modelId: string) => {
    setSelectedModels(prev =>
      prev.includes(modelId)
        ? prev.length > 1 ? prev.filter(m => m !== modelId) : prev
        : [...prev, modelId]
    )
  }, [])

  const processAudio = useCallback(async (audioBlob: Blob) => {
    setStatus(STATUS.PROCESSING)
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    formData.append('models', selectedModelsRef.current.join(','))

    try {
      const response = await fetch('/api/process-audio', { method: 'POST', body: formData })
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to process audio')
      }
      const data: PromptResponse = await response.json()
      setResults(data.results ?? [])
      setStatus(STATUS.SUCCESS)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus(STATUS.ERROR)
    }
  }, [])

  const { start: startRecorder, stop: stopRecorder } = useAudioRecorder({
    onAnalyserReady: setAnalyser,
    onStop: (blob) => { processAudio(blob) },
    onError: (msg) => { setError(msg); setStatus(STATUS.ERROR) },
  })

  const startRecording = useCallback(async () => {
    setError('')
    setResults([])
    setAnalyser(null)
    await startRecorder()
    setStatus(STATUS.RECORDING)
  }, [startRecorder])

  const stopRecording = useCallback(() => {
    stopRecorder()
    setAnalyser(null)
  }, [stopRecorder])

  const reset = useCallback(() => {
    setStatus(STATUS.IDLE)
    setResults([])
    setError('')
    setAnalyser(null)
  }, [])

  const isRecording = status === STATUS.RECORDING
  const isProcessing = status === STATUS.PROCESSING

  useEffect(() => {
    if (!advancedMode) return
    const handleClickOutside = () => setAdvancedMode(false)
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [advancedMode])

  const toggleAdvanced = (e: React.MouseEvent) => {
    e.stopPropagation()
    setAdvancedMode(prev => !prev)
  }

  return (
    <div className="h-screen flex flex-col px-8 py-4 max-w-[1400px] mx-auto overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header / Masthead */}
      <header className="flex justify-between items-end border-b border-[var(--border-strong)] pb-4 mb-6 flex-shrink-0">
        <h1 className="display-serif text-[4rem] font-light text-[var(--text-primary)] leading-none">
          Баёни Промпт
        </h1>
        <div className="flex flex-col items-end mono-label text-[var(--text-secondary)] leading-tight">
          <span>Нашри I — Шумораи 04</span>
          <span>{currentDate}</span>
          <span>Душанбе / Сан Франсиско</span>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex relative min-h-0">
        {/* Vertical Divider */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[var(--border-subtle)] -translate-x-1/2" />

        {/* Left Column — Input Side */}
        <section className="w-1/2 flex flex-col pr-12 py-4 overflow-hidden relative">
          <div className="flex-1 flex flex-col items-center justify-center gap-8">
            <p className="italic-serif text-[var(--text-secondary)] text-lg text-center max-w-[280px]">
              Табдили гуфтори хом ба сохтори мукаммали синтаксисӣ.
            </p>

            <div className="flex flex-col items-center gap-6">
              <motion.button
                whileHover={{ backgroundColor: 'var(--bg-accent)', color: 'var(--bg-primary)' }}
                animate={{
                  backgroundColor: isRecording ? 'var(--accent)' : 'transparent',
                  borderColor: isRecording ? 'var(--accent)' : 'var(--border-subtle)',
                  boxShadow: isRecording ? '0 0 20px var(--accent)' : 'none'
                }}
                transition={{ duration: 0 }}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`w-[120px] h-[120px] rounded-full border border-[var(--border-subtle)] flex items-center justify-center`}
                aria-label={isRecording ? 'Ист' : 'Оғоз'}
              >
                {isRecording ? <MicOff size={40} strokeWidth={1} /> : <Mic size={40} strokeWidth={1} />}
              </motion.button>

              <span className="mono-label text-[var(--text-secondary)]">
                {isRecording ? 'ГӮШ КАРДА ИСТОДААМ...' : isProcessing ? 'КОРКАРД...' : 'СУХАНРОНӢ'}
              </span>
            </div>
          </div>

          <div className="w-full mt-8 relative flex-shrink-0">
            <button
              onClick={toggleAdvanced}
              className={`w-full py-3 border mono-label transition-colors hover:bg-[var(--bg-secondary)] ${
                advancedMode 
                  ? 'border-[var(--accent)] text-[var(--accent)]' 
                  : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              ҲОЛАТИ ПЕШРАФТА
            </button>

            <AnimatePresence>
              {advancedMode && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 w-full mb-4 z-50 shadow-2xl"
                >
                  <ModelSelector
                    advancedMode={advancedMode}
                    onToggleAdvanced={() => {}}
                    selectedModels={selectedModels}
                    onToggleModel={toggleModel}
                    onClose={() => setAdvancedMode(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Right Column — Output Side */}
        <section className="w-1/2 flex flex-col pl-12 py-4 overflow-hidden h-full">
          <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
            <ResultsPanel
              status={status}
              results={results}
              error={error}
              onReset={reset}
              advancedMode={advancedMode}
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-6 pt-4 border-t border-[var(--border-strong)] flex justify-between items-center mono-label text-[var(--text-muted)] flex-shrink-0">
        <span>© {new Date().getFullYear()} Пиндори Нав</span>
        {advancedMode && (
          <span className="opacity-60">{selectedModels.length} {selectedModels.length > 1 ? 'моделҳо' : 'модел'} интихоб шудаанд</span>
        )}
      </footer>
    </div>
  )
}
