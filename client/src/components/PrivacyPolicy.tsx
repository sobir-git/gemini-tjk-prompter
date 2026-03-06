import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function PrivacyPolicy({ isOpen, onClose }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl max-h-[80vh] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex justify-between items-center p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
              <h2 className="display-serif text-2xl font-light text-[var(--text-primary)]">Сиёсати маҳрамият</h2>
              <button
                onClick={onClose}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Пӯшидан"
              >
                <X size={24} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6 text-[var(--text-secondary)] leading-relaxed mono-label">
              <section className="space-y-3">
                <h3 className="text-[var(--text-primary)] text-sm uppercase tracking-wide">Маълумоти умумӣ</h3>
                <p className="text-[11px] leading-relaxed">
                  Мо ба маҳрамияти шумо эҳтиром мегузорем. Ин ҳуҷҷат мефаҳмонад, ки ҳангоми истифодаи хидмати мо чӣ гуна маълумот ҷамъоварӣ мешавад.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-[var(--text-primary)] text-sm uppercase tracking-wide">Чӣ гуна маълумот ҷамъ намешавад</h3>
                <p className="text-[11px] leading-relaxed border-l-2 border-[var(--accent)] pl-4">
                  Мо ҳеҷ гуна маълумоти шахсӣ, сабтҳои аудиоӣ ё натиҷаҳои коркарди моделро <strong>захира намекунем</strong>.
                </p>
                <ul className="list-disc pl-5 space-y-2 text-[11px] leading-relaxed opacity-80">
                  <li>Сабтҳои аудиоӣ фавран пас аз коркард нест карда мешаванд.</li>
                  <li>Матни ҳосилшуда танҳо ба шумо нишон дода мешавад ва дар сервери мо нигоҳ дошта намешавад.</li>
                  <li>Мо ном, суроғаи почтаи электронӣ ё дигар маълумоти мушаххаскунандаро намепурсем.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-[var(--text-primary)] text-sm uppercase tracking-wide">Чӣ гуна маълумот ҷамъ мешавад (Телеметрия)</h3>
                <p className="text-[11px] leading-relaxed">
                  Барои беҳтар кардани хидмат ва назорати сифат, мо танҳо маълумоти зерини анонимиро ҷамъоварӣ мекунем:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-[11px] leading-relaxed opacity-80">
                  <li>Кадом модели зеҳни сунъӣ истифода шуд.</li>
                  <li>Вақти иҷрои дархост ва давомнокии аудио.</li>
                  <li>Ҳолати дархост (муваффақият ё хатогӣ).</li>
                  <li>Вақти дақиқи истифодаи хидмат.</li>
                </ul>
              </section>

              <section className="space-y-3 pt-4 border-t border-[var(--border-subtle)]">
                <p className="text-[10px] text-[var(--text-muted)]">
                  Истифодаи ин хидмат маънои розигии шуморо ба ҷамъоварии маълумоти анонимии дар боло зикршуда дорад.
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
