import { Fragment } from 'react'
import { Link } from 'react-router'

const TOKEN = /([#@][\p{L}\p{N}_.]+)/gu

/** Texto con #hashtags → /hashtags/:nombre y @menciones → /:username. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const partes = text.split(TOKEN)
  return (
    <span className={className}>
      {partes.map((p, i) => {
        if (p.startsWith('#') && p.length > 1) {
          return (
            <Link key={i} to={`/hashtags/${encodeURIComponent(p.slice(1).toLowerCase())}`} className="text-primary">
              {p}
            </Link>
          )
        }
        if (p.startsWith('@') && p.length > 1) {
          const u = p.slice(1).replace(/\.+$/, '')
          return (
            <Link key={i} to={`/${u}`} className="text-primary">
              {p}
            </Link>
          )
        }
        return <Fragment key={i}>{p}</Fragment>
      })}
    </span>
  )
}
