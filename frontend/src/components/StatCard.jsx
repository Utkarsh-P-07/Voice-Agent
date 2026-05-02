export default function StatCard({ icon, value, label, color = 'text-accent' }) {
  return (
    <div className="card flex flex-col gap-1">
      <span className={`text-2xl ${color}`}>{icon}</span>
      <span className="text-3xl font-bold text-gray-900 leading-none">{value}</span>
      <span className="text-xs text-gray-400 font-medium">{label}</span>
    </div>
  )
}
