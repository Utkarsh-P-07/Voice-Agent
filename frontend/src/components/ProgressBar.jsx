export default function ProgressBar({ value = 0, max = 100, color = 'bg-accent' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
      <div
        className={`${color} h-2.5 rounded-full transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
