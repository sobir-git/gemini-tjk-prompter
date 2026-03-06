import { AVAILABLE_MODELS } from '../types'

interface Props {
  advancedMode: boolean
  onToggleAdvanced: () => void
  selectedModels: string[]
  onToggleModel: (id: string) => void
}

export default function ModelSelector({ advancedMode, selectedModels, onToggleModel }: Props) {
  if (!advancedMode) return null;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 w-full flex flex-col max-h-[400px]">
      <div className="flex justify-between items-center mb-6 border-b border-[var(--border-subtle)] pb-2 flex-shrink-0">
        <span className="mono-label text-[var(--text-secondary)] text-[10px]">Model Selection</span>
        <span className="mono-label text-[var(--accent)] text-[10px]">{selectedModels.length} Active</span>
      </div>
      
      <div className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
        {AVAILABLE_MODELS.map(model => {
          const active = selectedModels.includes(model.id)
          return (
            <button
              key={model.id}
              onClick={() => onToggleModel(model.id)}
              className={`flex items-center justify-between px-4 py-3 transition-colors mono-label text-[11px] border flex-shrink-0 ${
                active 
                  ? 'bg-[var(--bg-secondary)] border-[var(--accent)] text-[var(--text-primary)]' 
                  : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border-subtle)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <span>{model.label}</span>
              {active && <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
