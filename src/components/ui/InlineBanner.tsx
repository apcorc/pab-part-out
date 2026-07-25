import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

interface InlineBannerProps {
  tone?: 'info' | 'success' | 'error'
  title?: string
  messages: string[]
  onDismiss?: () => void
}

export function InlineBanner({
  tone = 'info',
  title,
  messages,
  onDismiss,
}: InlineBannerProps) {
  if (messages.length === 0) return null

  const Icon =
    tone === 'error' ? AlertCircle : tone === 'success' ? CheckCircle2 : Info

  return (
    <div className={`banner banner-${tone}`} role="status">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title ? <p className="text-sm font-medium">{title}</p> : null}
        <ul className="mt-0.5 list-inside list-disc text-xs opacity-90">
          {messages.slice(0, 8).map((m) => (
            <li key={m}>{m}</li>
          ))}
          {messages.length > 8 ? (
            <li>…and {messages.length - 8} more</li>
          ) : null}
        </ul>
      </div>
      {onDismiss ? (
        <button
          type="button"
          className="btn-icon"
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
