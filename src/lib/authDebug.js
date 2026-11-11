// DEV-only auth debugging aids — no-ops (badge never created) in production build.
const DEV = import.meta.env.DEV

let badge = null

function fmtExpiry(session) {
  const raw = session?.expires_at
  if (!raw) return ''
  const d = new Date(raw * 1000)
  if (Number.isNaN(d.getTime())) return ''
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return ` ${hh}:${mm}`
}

export function logAuthEvent(event, session) {
  if (!DEV) return
  console.debug('[auth]', event, session ? 'session' : 'null')
}

export function showSessionBadge(session) {
  if (!DEV) return
  if (!badge) {
    badge = document.createElement('div')
    badge.style.cssText =
      'position:fixed;top:8px;right:8px;z-index:50;font-family:monospace;font-size:12px;background:#fff;border:1px solid #ccc;padding:2px 6px;border-radius:4px;pointer-events:none'
    document.body.appendChild(badge)
  }
  badge.textContent = session
    ? `auth: SIGNED_IN${fmtExpiry(session)}`
    : 'auth: INITIAL_SESSION (no session)'
}
