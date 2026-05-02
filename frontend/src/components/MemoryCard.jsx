import clsx from 'clsx'

const CAT_STYLES = {
  preference: 'bg-purple-100 text-purple-700',
  event:      'bg-cyan-100 text-cyan-700',
  goal:       'bg-amber-100 text-amber-700',
  general:    'bg-gray-100 text-gray-600',
}

export default function MemoryCard({ memory }) {
  const cat = memory.category || 'general'
  const ts  = memory.timestamp?.slice(0, 16).replace('T', '  ') || ''

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className={clsx('pill text-[11px] font-semibold', CAT_STYLES[cat] || CAT_STYLES.general)}>
          {cat}
        </span>
        <span className="text-[11px] text-gray-400">{ts}</span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{memory.content}</p>
    </div>
  )
}
