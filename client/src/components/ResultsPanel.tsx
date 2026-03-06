import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, AlertCircle } from 'lucide-react'
import { AppStatus, ModelResult, STATUS } from '../types'

interface Props {
  status: AppStatus
  results: ModelResult[]
  error: string
  onReset: () => void
  advancedMode: boolean
}

export default function ResultsPanel({ status, results, error, onReset, advancedMode }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const isProcessing = status === STATUS.PROCESSING
  const showModelLabels = advancedMode || results.length > 1

  return (
    <div className="h-full flex flex-col">
      <AnimatePresence mode="wait">
        {status === STATUS.IDLE && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center"
          >
            <p className="italic-serif text-[var(--text-muted)] text-xl opacity-50 text-center">
              Мунтазири воридот. Саҳифа холӣ аст.
            </p>
          </motion.div>
        )}

        {isProcessing && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-4"
          >
            <div className="w-12 h-px bg-[var(--accent)] animate-pulse" />
            <p className="mono-label text-[var(--text-secondary)] animate-pulse">
              Синтез рафта истодааст...
            </p>
          </motion.div>
        )}

        {status === STATUS.SUCCESS && results.length > 0 && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8"
          >
            {results.map((r) => (
              <div key={r.model} className="flex flex-col">
                <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden">
                  {showModelLabels && (
                    <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] px-4 py-2">
                      <span className="mono-label text-[var(--text-muted)] text-[10px]">
                        {r.model}
                      </span>
                    </div>
                  )}
                  <div className="p-6">
                    {r.error ? (
                      <p className="text-[var(--accent)] italic-serif">{r.error}</p>
                    ) : (
                      <p className="text-[var(--text-primary)] leading-relaxed font-sans text-lg whitespace-pre-wrap">
                        {r.optimized_prompt}
                      </p>
                    )}
                  </div>
                </div>

                {!r.error && (
                  <>
                    <div className="mt-4 flex justify-between items-center px-1">
                      <button
                        onClick={() => handleCopy(r.optimized_prompt, r.model)}
                        className="flex items-center gap-2 mono-label text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border-subtle)] px-3 py-1.5 hover:bg-[var(--bg-secondary)]"
                      >
                        {copiedId === r.model ? <Check size={14} className="text-[var(--accent)]" /> : <Copy size={14} />}
                        <span>{copiedId === r.model ? 'НУСХАБАРДОРӢ ШУД' : 'НУСХАБАРДОРӢ'}</span>
                      </button>
                      <span className="mono-label text-[var(--text-muted)] text-[10px]">
                        {(r.time_ms / 1000).toFixed(2)}с
                      </span>
                    </div>
                    <div className="mt-8 border-t border-dotted border-[var(--border-subtle)] w-full opacity-50" />
                  </>
                )}
              </div>
            ))}
            
            <button
              onClick={onReset}
              className="mt-4 mono-label text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors self-center"
            >
              [ ТОЗА КАРДАНИ САҲИФА ]
            </button>
          </motion.div>
        )}

        {status === STATUS.ERROR && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center gap-6"
          >
            <div className="flex items-center gap-3 text-[var(--accent)]">
              <AlertCircle size={24} strokeWidth={1.5} />
              <span className="mono-label">Транскрипсия қатъ шуд</span>
            </div>
            <p className="text-[var(--text-secondary)] italic-serif text-center max-w-md">
              {error}
            </p>
            <button
              onClick={onReset}
              className="px-6 py-2 border border-[var(--accent)] text-[var(--accent)] mono-label hover:bg-[var(--accent)] hover:text-white transition-all"
            >
              ТАКРОР
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
