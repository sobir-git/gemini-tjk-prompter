import { SlidersHorizontal } from 'lucide-react'
import { AVAILABLE_MODELS } from '../types'

interface Props {
  advancedMode: boolean
  onToggleAdvanced: () => void
  selectedModels: string[]
  onToggleModel: (id: string) => void
}

export default function ModelSelector({ advancedMode, onToggleAdvanced, selectedModels, onToggleModel }: Props) {
  return (
    <>
      <button
        onClick={onToggleAdvanced}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          borderRadius: '4px',
          border: `1px solid ${advancedMode ? 'var(--accent)' : 'var(--border-light)'}`,
          background: 'transparent',
          color: advancedMode ? 'var(--accent)' : 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          cursor: 'pointer',
          width: '100%',
          transition: 'border-color 0.2s, color 0.2s',
        }}
      >
        <SlidersHorizontal size={12} />
        Advanced Mode
      </button>

      {advancedMode && (
        <div>
          <p style={{
            marginBottom: '0.5rem',
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
          }}>
            Select Models — {selectedModels.length} active
          </p>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
            overflowY: 'auto',
            maxHeight: '220px',
            paddingRight: '4px',
          }}>
            {AVAILABLE_MODELS.map(model => {
              const active = selectedModels.includes(model.id)
              return (
                <button
                  key={model.id}
                  onClick={() => onToggleModel(model.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '4px',
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--border-light)'}`,
                    background: active ? 'var(--bg-secondary)' : 'transparent',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-sans)',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    border: `1px solid ${active ? 'var(--accent)' : 'currentColor'}`,
                    background: active ? 'var(--accent)' : 'transparent',
                    flexShrink: 0,
                    transition: 'background 0.15s, border-color 0.15s',
                  }} />
                  {model.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
