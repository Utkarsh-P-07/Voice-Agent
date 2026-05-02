import { Zap, CheckCircle2, Brain, BarChart2, Mic } from 'lucide-react'

const FEATURES = [
  { icon: CheckCircle2, text: 'Smart task management with AI' },
  { icon: Mic,          text: 'Voice-first interaction' },
  { icon: Brain,        text: 'Persistent memory across sessions' },
  { icon: BarChart2,    text: 'Productivity analytics & insights' },
]

/* Floating decorative orb */
function Orb({ size, top, left, opacity, delay }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size, height: size,
        top, left, opacity,
        background: 'radial-gradient(circle, #f97316, #fb923c)',
        filter: 'blur(60px)',
        animation: `float 4s ease-in-out ${delay} infinite`,
      }}
    />
  )
}

export default function AuthLayout({ children, mode }) {
  return (
    <div className="min-h-screen flex bg-[#e8e8ed] overflow-hidden">

      {/* ── Left panel — branding ──────────────────────────────────────── */}
      <div
        className="hidden lg:flex w-[45%] flex-shrink-0 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #1c1c1e 0%, #2c2c2e 60%, #1a1a1c 100%)' }}
      >
        {/* Decorative orbs */}
        <Orb size="320px" top="-80px"  left="-80px"  opacity={0.15} delay="0s"    />
        <Orb size="200px" top="40%"    left="60%"    opacity={0.10} delay="1.5s"  />
        <Orb size="150px" top="75%"    left="-20px"  opacity={0.12} delay="0.8s"  />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />

        {/* Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', boxShadow: '0 6px 20px rgba(249,115,22,0.4)' }}>
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">VoiceAgent</p>
              <p className="text-gray-500 text-xs mt-0.5">AI Productivity</p>
            </div>
          </div>

          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Your AI-powered<br />
            <span style={{
              background: 'linear-gradient(135deg, #f97316, #fb923c)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
            }}>
              productivity hub
            </span>
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
            Manage tasks with your voice, remember what matters, and stay focused — all in one intelligent workspace.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-4">
          {FEATURES.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.25)' }}>
                <Icon size={14} className="text-orange-400" />
              </div>
              <span className="text-gray-300 text-sm">{text}</span>
            </div>
          ))}
        </div>

        {/* Bottom testimonial */}
        <div className="relative z-10 rounded-3xl p-5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-gray-300 text-sm leading-relaxed italic mb-3">
            "VoiceAgent changed how I manage my day. I just talk and it handles everything."
          </p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)' }}>A</div>
            <div>
              <p className="text-white text-xs font-semibold">Alex M.</p>
              <p className="text-gray-500 text-[10px]">Product Designer</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}>
              <Zap size={17} className="text-white" />
            </div>
            <span className="text-gray-900 font-bold text-lg">VoiceAgent</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
