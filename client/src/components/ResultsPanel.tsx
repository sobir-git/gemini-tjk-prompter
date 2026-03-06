import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, AlertCircle } from 'lucide-react'
import { AppStatus, ModelResult, STATUS } from '../types'

interface Props {
  status: AppStatus
  results: ModelResult[]
  error: string
  onReset: () => void
}

export default function ResultsPanel({ status, results, error, onReset }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const isProcessing = status === STATUS.PROCESSING
  const isMulti = results.length > 1

  return (
    <section className="app-results">
      <AnimatePresence mode="wait">

        {status === STATUS.IDLE && (
          <motion.p
            key="idle"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontStyle: 'italic', color: 'var(--text-muted)', paddingTop: '2rem' }}
          >
            Awaiting input. The canvas is blank.
          </motion.p>
        )}

        {isProcessing && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="loader"
          >
            Synthesizing
          </motion.div>
        )}

        {status === STATUS.SUCCESS && results.length > 0 && (
          <motion.div
            key="success"
            className="results-list flex flex-col gap-8 w-full min-w-0"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          >
            {results.map((r) => (
              <div
                key={r.model}
                className={`flex flex-col min-w-0${isMulti ? ' border border-[var(--border-light)] rounded overflow-hidden' : ''}`}
              >
                {isMulti && (
                  <div className="text-[0.7rem] font-mono uppercase tracking-[0.08em] text-[var(--text-muted)] px-6 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-light)]">
                    {r.model}
                  </div>
                )}
                {r.error ? (
                  <div className="text-[0.8rem] font-mono text-[var(--accent)] p-6 bg-[var(--bg-card)]">
                    {r.error}
                  </div>
                ) : (
                  <div
                    className={`text-[1.1rem] leading-[1.8] text-[var(--text-primary)] whitespace-pre-wrap break-words bg-[var(--bg-card)] p-8 border border-[var(--border-light)] rounded${isMulti ? ' result-card-multi-body' : ''}`}
                    style={{ fontFamily: 'var(--font-sans)' }}
                  >
                    {r.optimized_prompt}
                  </div>
                )}
                {!r.error && (
                  <div className={`flex justify-between items-center gap-4 mt-6 pt-4 border-t border-dotted border-[var(--border-light)]${isMulti ? ' px-6 py-3 mt-0 bg-[var(--bg-secondary)]' : ''}`}>
                    <button
                      onClick={() => handleCopy(r.optimized_prompt, r.model)}
                      className="flex items-center gap-2 px-5 py-2 rounded border border-[var(--border-light)] bg-transparent text-[var(--text-muted)] font-mono text-[0.72rem] uppercase tracking-[0.05em] cursor-pointer transition-all duration-200 hover:bg-[var(--bg-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      {copiedId === r.model ? <Check size={14} /> : <Copy size={14} />}
                      {copiedId === r.model ? 'Copied' : 'Copy'}
                    </button>
                    <span className="text-[0.85rem] font-mono uppercase tracking-[0.05em] text-[var(--text-muted)]">
                      {(r.time_ms / 1000).toFixed(2)}s
                    </span>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {status === STATUS.ERROR && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-8 p-8 border border-dashed border-[var(--accent)] text-[var(--accent)] font-mono"
          >
            <div className="flex gap-4 items-center mb-4">
              <AlertCircle size={24} />
              <span className="text-[1.1rem]">Transcription Interrupted</span>
            </div>
            <p className="text-[0.9rem] text-[var(--text-muted)]">{error}</p>
            <button
              onClick={onReset}
              className="mt-8 flex items-center gap-2 px-5 py-2 rounded border border-[var(--accent)] bg-transparent text-[var(--accent)] font-mono text-[0.72rem] uppercase tracking-[0.05em] cursor-pointer transition-all duration-200 hover:bg-[var(--bg-secondary)]"
            >
              Reset
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </section>
  )
}
