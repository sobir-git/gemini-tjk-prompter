import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function ContactModal({ isOpen, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim()) {
      setStatus('error')
      setErrorMessage('Лутфан паёми худро ворид кунед')
      return
    }

    setStatus('loading')
    setErrorMessage('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, message }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Хатогӣ ҳангоми фиристодан')
      }

      setStatus('success')
      setEmail('')
      setMessage('')
      
      // Auto close after 3 seconds on success
      setTimeout(() => {
        if (isOpen) {
          handleClose()
        }
      }, 3000)
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Хатогии номаълум')
    }
  }

  const handleClose = () => {
    if (status !== 'loading') {
      onClose()
      // Reset state after animation
      setTimeout(() => {
        setStatus('idle')
        setErrorMessage('')
      }, 300)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex justify-between items-center p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
              <h2 className="display-serif text-2xl font-light text-[var(--text-primary)]">Тамос бо мо</h2>
              <button
                onClick={handleClose}
                disabled={status === 'loading'}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
                aria-label="Пӯшидан"
              >
                <X size={24} strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-8">
              {status === 'success' ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-8 text-center gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] mb-2">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="display-serif text-xl text-[var(--text-primary)]">Паёми шумо фиристода шуд!</h3>
                  <p className="text-[var(--text-secondary)] mono-label text-sm">
                    Ташаккур барои фикру мулоҳизаҳоятон.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-2">
                    Агар шумо ягон савол, пешниҳод ё мушкилоте дошта бошед, метавонед ба мо нависед.
                  </p>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="email" className="mono-label text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                      Почтаи электронӣ (ихтиёрӣ)
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nom@example.com"
                      disabled={status === 'loading'}
                      className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--text-muted)]/50"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="message" className="mono-label text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                      Паём <span className="text-[var(--accent)]">*</span>
                    </label>
                    <textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Фикру мулоҳиза ё саволи худро ин ҷо нависед..."
                      required
                      disabled={status === 'loading'}
                      rows={5}
                      className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--text-muted)]/50 resize-none custom-scrollbar"
                    />
                  </div>

                  {status === 'error' && (
                    <div className="flex items-center gap-2 text-[var(--accent)] bg-[var(--accent)]/10 p-3 border border-[var(--accent)]/20">
                      <AlertCircle size={16} className="shrink-0" />
                      <span className="text-[11px] mono-label">{errorMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'loading' || !message.trim()}
                    className="mt-2 flex items-center justify-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] py-3 px-6 hover:bg-[var(--accent)] hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-[var(--text-primary)] disabled:hover:text-[var(--bg-primary)] mono-label uppercase tracking-wider text-xs"
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Ирсол мешавад...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Ирсол кардан</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
