import { useAuth } from '../context/AuthContext'

/* Real SVG brand icons */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
      <path d="M47.532 24.552c0-1.636-.132-3.2-.388-4.704H24.48v9.02h12.984c-.572 2.98-2.24 5.5-4.748 7.196v5.98h7.68c4.496-4.14 7.136-10.24 7.136-17.492z" fill="#4285F4"/>
      <path d="M24.48 48c6.48 0 11.924-2.148 15.9-5.824l-7.68-5.98c-2.148 1.44-4.896 2.292-8.22 2.292-6.316 0-11.668-4.268-13.584-10.004H3.016v6.18C6.98 42.98 15.14 48 24.48 48z" fill="#34A853"/>
      <path d="M10.896 28.484A14.4 14.4 0 0 1 10.08 24c0-1.564.272-3.084.816-4.484v-6.18H3.016A23.96 23.96 0 0 0 .48 24c0 3.876.928 7.548 2.536 10.664l7.88-6.18z" fill="#FBBC05"/>
      <path d="M24.48 9.512c3.556 0 6.744 1.224 9.256 3.624l6.94-6.94C36.396 2.38 30.956 0 24.48 0 15.14 0 6.98 5.02 3.016 13.336l7.88 6.18c1.916-5.736 7.268-10.004 13.584-10.004z" fill="#EA4335"/>
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  )
}

const PROVIDERS = [
  { key: 'google', label: 'Google', Icon: GoogleIcon, textColor: '#4285F4' },
  { key: 'github', label: 'GitHub', Icon: GitHubIcon, textColor: '#24292e' },
]

export default function SocialButtons({ label = 'Continue' }) {
  const { oauthRedirect } = useAuth()

  return (
    <div className="grid grid-cols-2 gap-3">
      {PROVIDERS.map(({ key, label: name, Icon, textColor }) => (
        <button
          key={key}
          onClick={() => oauthRedirect(key)}
          className="flex items-center justify-center gap-2.5 py-3 rounded-2xl text-sm font-semibold
                     transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group"
          style={{
            background: '#eef0f5',
            boxShadow: '4px 4px 10px #d1d5db, -4px -4px 10px #ffffff',
            color: textColor,
          }}
        >
          <Icon />
          <span>{name}</span>
        </button>
      ))}
    </div>
  )
}
