import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff } from 'lucide-react'
import ModelSelector from './components/ModelSelector'
import ResultsPanel from './components/ResultsPanel'
import AudioVisualizer from './components/AudioVisualizer'
import PrivacyPolicy from './components/PrivacyPolicy'
import AboutModal from './components/AboutModal'
import ContactModal from './components/ContactModal'
import { useAudioRecorder } from './hooks/useAudioRecorder'
import { STATUS, AppStatus, ModelResult, PromptResponse, OutputLanguage, AVAILABLE_LANGUAGES } from './types'

export default function App() {
  const [status, setStatus] = useState<AppStatus>(STATUS.IDLE)
  const [results, setResults] = useState<ModelResult[]>([])
  const [error, setError] = useState('')
  const [currentDate, setCurrentDate] = useState('')
  const [advancedMode, setAdvancedMode] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [selectedModels, setSelectedModels] = useState<string[]>(() => {
    const saved = localStorage.getItem('selectedModels')
    return saved ? JSON.parse(saved) : ['gemini-3-pro-preview']
  })
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>(() => {
    const saved = localStorage.getItem('outputLanguage')
    return (saved as OutputLanguage) || 'english'
  })
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)

  const selectedModelsRef = useRef(selectedModels)
  const outputLanguageRef = useRef(outputLanguage)
  
  useEffect(() => { 
    selectedModelsRef.current = selectedModels 
    localStorage.setItem('selectedModels', JSON.stringify(selectedModels))
  }, [selectedModels])
  
  useEffect(() => {
    outputLanguageRef.current = outputLanguage
    localStorage.setItem('outputLanguage', outputLanguage)
  }, [outputLanguage])

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
    formData.append('output_language', outputLanguageRef.current)

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

  const { start: startRecorder, stop: stopRecorder, cancel: cancelRecorder } = useAudioRecorder({
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

  const cancelRecording = useCallback(() => {
    cancelRecorder()
    setAnalyser(null)
    setStatus(STATUS.IDLE)
  }, [cancelRecorder])

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
    <div className="h-screen flex flex-col px-4 md:px-8 py-4 max-w-[1400px] mx-auto overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header / Masthead */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-0 border-b border-[var(--border-strong)] pb-4 mb-4 md:mb-6 flex-shrink-0">
        <h1 className="display-serif text-[2.5rem] md:text-[4rem] font-light text-[var(--text-primary)] leading-none">
          Баёни Промпт
        </h1>
        <div className="flex flex-col items-start md:items-end mono-label text-[var(--text-secondary)] leading-tight">
          <span>Нашри I — Шумораи 04</span>
          <span>{currentDate}</span>
          <span>Душанбе / Сан Франсиско</span>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex flex-col md:flex-row relative min-h-0 overflow-y-auto md:overflow-hidden">
        {/* Divider */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-[var(--border-subtle)] -translate-x-1/2" />
        <div className="md:hidden w-full h-px bg-[var(--border-subtle)] my-6" />

        {/* Left Column — Input Side */}
        <section className="w-full md:w-1/2 flex flex-col md:pr-12 py-4 md:overflow-hidden relative min-h-[400px] md:min-h-0">
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
                className={`w-[120px] h-[120px] rounded-full border border-[var(--border-subtle)] flex items-center justify-center shrink-0`}
                aria-label={isRecording ? 'Ист' : 'Оғоз'}
              >
                {isRecording ? <MicOff size={40} strokeWidth={1} /> : <Mic size={40} strokeWidth={1} />}
              </motion.button>

              <span className="mono-label text-[var(--text-secondary)]">
                {isRecording ? 'ГӮШ КАРДА ИСТОДААМ...' : isProcessing ? 'КОРКАРД...' : 'СУХАНРОНӢ'}
              </span>

              {isRecording && (
                <button
                  onClick={cancelRecording}
                  className="mt-4 px-4 py-2 border border-[var(--accent)] text-[var(--accent)] mono-label text-xs hover:bg-[var(--accent)] hover:text-white transition-all"
                >
                  Бекор кардан
                </button>
              )}

              {isRecording && analyser && (
                <div className="h-[60px] w-full max-w-[300px] flex items-center justify-center opacity-80 mt-4 transition-opacity duration-300">
                  <AudioVisualizer analyser={analyser} />
                </div>
              )}
            </div>
          </div>

          <div className="w-full mt-8 flex flex-col gap-4 flex-shrink-0">
            <div className="flex flex-col gap-2">
              <span className="mono-label text-[var(--text-secondary)] text-[10px]">Забони натиҷа</span>
              <div className="flex flex-wrap md:flex-nowrap gap-2">
                {AVAILABLE_LANGUAGES.map(lang => {
                  const active = outputLanguage === lang.id
                  return (
                    <button
                      key={lang.id}
                      onClick={() => setOutputLanguage(lang.id)}
                      className={`flex-1 min-w-[80px] px-3 py-2 transition-colors mono-label text-[10px] border ${
                        active 
                          ? 'bg-[var(--bg-secondary)] border-[var(--accent)] text-[var(--text-primary)]' 
                          : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      {lang.nativeLabel}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="relative">
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
          </div>
        </section>

        <div className="md:hidden w-full h-px bg-[var(--border-subtle)] my-8" />

        {/* Right Column — Output Side */}
        <section className="w-full md:w-1/2 flex flex-col md:pl-12 py-4 md:overflow-hidden min-h-[500px] md:min-h-0 md:h-full">
          <div className="flex-1 md:overflow-y-auto pr-0 md:pr-4 custom-scrollbar">
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
      <footer className="mt-4 md:mt-6 pt-4 border-t border-[var(--border-strong)] flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0 mono-label text-[var(--text-muted)] flex-shrink-0 text-[10px] sm:text-xs md:text-sm text-center md:text-left">
        <span className="shrink-0">© {new Date().getFullYear()} Пиндори Нав</span>
        <div className="flex flex-row flex-wrap justify-center items-center gap-x-4 gap-y-2 md:gap-6">
          <button 
            onClick={() => setShowContact(true)}
            className="hover:text-[var(--text-secondary)] transition-colors underline-offset-4 hover:underline whitespace-nowrap"
          >
            Тамос бо мо
          </button>
          <span className="md:hidden text-[var(--border-subtle)]">•</span>
          <button 
            onClick={() => setShowAbout(true)}
            className="hover:text-[var(--text-secondary)] transition-colors underline-offset-4 hover:underline whitespace-nowrap"
          >
            Дар бораи барнома
          </button>
          <span className="md:hidden text-[var(--border-subtle)]">•</span>
          <button 
            onClick={() => setShowPrivacy(true)}
            className="hover:text-[var(--text-secondary)] transition-colors underline-offset-4 hover:underline whitespace-nowrap"
          >
            Сиёсати маҳрамият
          </button>
        </div>
      </footer>

      <PrivacyPolicy isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <ContactModal isOpen={showContact} onClose={() => setShowContact(false)} />
    </div>
  )
}
