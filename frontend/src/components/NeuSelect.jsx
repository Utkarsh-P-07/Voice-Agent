import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

/**
 * NeuSelect — a fully themed neumorphic dropdown.
 * Props:
 *   value      — current selected value
 *   onChange   — (value) => void
 *   options    — [{ value, label, dot? }]  dot = optional color class for the dot
 *   className  — extra classes on the trigger
 */
export default function NeuSelect({ value, onChange, options, className = '' }) {
  const [open, setOpen] = useState(false)
  const ref  = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const selected = options.find(o => o.value === value) || options[0]

  return (
    <div ref={ref} className={`relative ${className}`}>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl
                   text-sm font-medium text-gray-700 transition-all duration-150
                   hover:scale-[1.01] active:scale-[0.99] select-none"
        style={{ background: '#eef0f5', boxShadow: open
          ? 'inset 3px 3px 7px #d1d5db, inset -3px -3px 7px #ffffff'
          : '4px 4px 10px #d1d5db, -4px -4px 10px #ffffff'
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selected.dot && (
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${selected.dot}`} />
          )}
          <span className="truncate">{selected.label}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-2 rounded-2xl overflow-hidden"
          style={{
            background: '#eef0f5',
            boxShadow: '8px 8px 20px #d1d5db, -8px -8px 20px #ffffff',
          }}
        >
          {options.map(opt => {
            const isActive = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5
                           text-sm font-medium transition-all duration-100 select-none"
                style={isActive
                  ? { background: 'linear-gradient(135deg,#f97316,#fb923c)', color: '#fff' }
                  : { color: '#374151' }
                }
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(249,115,22,0.07)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '' }}
              >
                <div className="flex items-center gap-2">
                  {opt.dot && (
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-white/80' : opt.dot}`}
                    />
                  )}
                  <span>{opt.label}</span>
                </div>
                {isActive && <Check size={13} className="text-white flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
