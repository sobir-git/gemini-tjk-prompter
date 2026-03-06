import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff } from 'lucide-react'
import AudioVisualizer from './components/AudioVisualizer'
import ModelSelector from './components/ModelSelector'
import ResultsPanel from './components/ResultsPanel'
import { useAudioRecorder } from './hooks/useAudioRecorder'
import { STATUS, AppStatus, ModelResult, PromptResponse } from './types'
import './App.css'

export default function App() {
  const [status, setStatus] = useState<AppStatus>(STATUS.IDLE)
  const [results, setResults] = useState<ModelResult[]>([])
  const [error, setError] = useState('')
  const [currentDate, setCurrentDate] = useState('')
  const [advancedMode, setAdvancedMode] = useState(false)
  const [selectedModels, setSelectedModels] = useState(['gemini-2.5-flash'])
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)

  const selectedModelsRef = useRef(selectedModels)
  useEffect(() => { selectedModelsRef.current = selectedModels }, [selectedModels])

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    }))
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

  return (
    <div className="app-shell">

      <header className="app-header">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem,6vw,4rem)', fontWeight: 400, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
          The Art<br />of the Prompt
        </h1>
        <div className="text-right flex flex-col gap-2 text-[var(--text-muted)] mono">
          <span>Vol. I — Issue 04</span>
          <span>{currentDate}</span>
          <span>London / San Francisco</span>
        </div>
      </header>

      <main className="app-main">

        <aside className="app-sidebar">

          {/* Center section: lead + record button */}
          <div className="action-grow">
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', lineHeight: 1.35, fontStyle: 'italic', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Transforming raw vocalization into structured syntax.
            </p>

            <button
              className={`record-btn${isRecording ? ' recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
              {isRecording ? <MicOff size={40} strokeWidth={1} /> : <Mic size={40} strokeWidth={1} />}
            </button>

            <div className="mono text-[var(--text-muted)] text-center">
              <span>{isRecording ? 'LISTENING...' : isProcessing ? 'PROCESSING...' : 'DICTATE'}</span>
            </div>

            <div className="w-full h-[60px] relative">
              <AnimatePresence>
                {isRecording && analyser && (
                  <motion.div
                    className="absolute inset-0"
                    style={{ opacity: 0.4 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    exit={{ opacity: 0 }}
                  >
                    <AudioVisualizer analyser={analyser} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom: advanced mode toggle */}
          <ModelSelector
            advancedMode={advancedMode}
            onToggleAdvanced={() => setAdvancedMode(v => !v)}
            selectedModels={selectedModels}
            onToggleModel={toggleModel}
          />
        </aside>

        <ResultsPanel
          status={status}
          results={results}
          error={error}
          onReset={reset}
        />
      </main>

      <footer className="app-footer mono text-[var(--text-muted)]">
        <span>© {new Date().getFullYear()} Vox Synth</span>
        {advancedMode && (
          <span>{selectedModels.length} model{selectedModels.length > 1 ? 's' : ''} selected</span>
        )}
      </footer>
    </div>
  )
}
