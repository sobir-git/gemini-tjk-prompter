import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function AboutModal({ isOpen, onClose }: Props) {
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
              <h2 className="display-serif text-2xl font-light text-[var(--text-primary)]">Дар бораи барнома</h2>
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
                <p className="text-[13px] leading-relaxed">
                  Ин барнома барои табдил додани гуфтори хом ба матни сохторёфта ва мукаммали синтаксисӣ тавассути моделҳои пешрафтаи зеҳни сунъӣ сохта шудааст.
                </p>
                <p className="text-[13px] leading-relaxed mt-4">
                  Шумо метавонед овози худро сабт кунед ва барнома онро ба матни тозаву фаҳмо табдил медиҳад. Ин барои навиштани мақолаҳо, гирифтани қайдҳо ва тартиб додани ҳуҷҷатҳо хеле муфид аст.
                </p>
                <p className="text-[13px] leading-relaxed mt-4">
                  Барнома моделҳои гуногуни зеҳни сунъиро ба монанди Gemini, Claude ва ғайра дастгирӣ мекунад ва имкон медиҳад, ки натиҷаҳоро бо забонҳои гуногун дастрас намоед.
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
