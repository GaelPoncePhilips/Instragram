import type { InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'
import { cn } from '../../lib/hooks'
import { Icon } from './Icon'

// ---------- Switch con ícono (M3)
interface SwitchProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
  disabled?: boolean
  /** Ícono del thumb cuando está activo (por defecto "check"). */
  icon?: string
}

export function Switch({ checked, onChange, label, description, disabled, icon = 'check' }: SwitchProps) {
  const id = useId()
  return (
    <label htmlFor={id} className={cn('flex items-center gap-4 py-3', disabled ? 'opacity-50' : 'cursor-pointer')}>
      <span className="flex-1">
        <span className="type-body-l block">{label}</span>
        {description && <span className="type-body-m block text-on-surface-variant">{description}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-8 w-[52px] shrink-0 rounded-full border-2 transition-colors spring-effects',
          checked ? 'border-primary bg-primary' : 'border-outline bg-surface-container-highest',
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full transition-all spring-spatial-fast',
            checked ? 'left-[22px] size-6 bg-on-primary text-on-primary-container' : 'left-[2px] size-6 bg-outline text-surface-container-highest',
          )}
        >
          <Icon name={checked ? icon : 'close'} size={16} fill={checked && icon !== 'check'} />
        </span>
      </button>
    </label>
  )
}

// ---------- Tabs primarias (M3) con ícono — usadas en el perfil
export interface TabItem {
  id: string
  label: string
  icon: string
}

export function Tabs({ items, value, onChange, iconOnlyMobile }: { items: TabItem[]; value: string; onChange: (id: string) => void; iconOnlyMobile?: boolean }) {
  return (
    <div role="tablist" className="flex border-t border-outline-variant/60">
      {items.map((t) => {
        const sel = t.id === value
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={sel}
            aria-label={t.label}
            onClick={() => onChange(t.id)}
            className={cn(
              'state relative flex h-12 flex-1 items-center justify-center gap-1.5 type-label-l uppercase tracking-wide',
              sel ? 'text-on-surface' : 'text-on-surface-variant',
            )}
          >
            <Icon name={t.icon} fill={sel} size={iconOnlyMobile ? 24 : 18} />
            <span className={cn(iconOnlyMobile && 'hidden md:inline', sel && 'emphasized')}>{t.label}</span>
            <span
              className={cn(
                'absolute top-0 left-1/2 h-[3px] -translate-x-1/2 rounded-b-full bg-on-surface transition-all spring-spatial-fast',
                sel ? 'w-12' : 'w-0',
              )}
              aria-hidden="true"
            />
          </button>
        )
      })}
    </div>
  )
}

// ---------- Chip de entrada (M3) para elegir amigos
export function InputChip({ label, avatar, onRemove }: { label: string; avatar?: ReactNode; onRemove: () => void }) {
  return (
    <span className="anim-fab-item inline-flex h-8 items-center gap-1.5 rounded-sm border border-outline-variant bg-secondary-container pr-1 pl-1 text-on-secondary-container type-label-l">
      {avatar}
      <span className="max-w-[140px] truncate">{label}</span>
      <button type="button" aria-label={`Quitar a ${label}`} onClick={onRemove} className="state flex size-6 items-center justify-center rounded-full">
        <Icon name="close" size={16} />
      </button>
    </span>
  )
}

export function FilterChip({ label, selected, onClick, icon }: { label: string; selected: boolean; onClick: () => void; icon?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'state inline-flex h-8 items-center gap-1.5 rounded-sm px-3 type-label-l transition-colors',
        selected ? 'bg-secondary-container text-on-secondary-container' : 'border border-outline-variant text-on-surface-variant',
      )}
    >
      {(selected || icon) && <Icon name={selected ? 'check' : (icon ?? 'check')} size={18} />}
      {label}
    </button>
  )
}

// ---------- Search bar (M3)
interface SearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Buscar', className, ...rest }: SearchBarProps) {
  return (
    <div className={cn('flex h-12 items-center gap-2 rounded-full bg-surface-container-high px-4', className)}>
      <Icon name="search" size={22} className="text-on-surface-variant" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="type-body-l h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-on-surface-variant"
        {...rest}
      />
      {value && (
        <button type="button" aria-label="Borrar búsqueda" onClick={() => onChange('')} className="state flex size-8 items-center justify-center rounded-full">
          <Icon name="close" size={20} />
        </button>
      )}
    </div>
  )
}

// ---------- Campo de texto (outlined M3)
interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string | null
  hint?: string
  multiline?: boolean
  maxLength?: number
}

export function TextField({ label, value, onChange, error, hint, multiline, maxLength, className, ...rest }: TextFieldProps) {
  const id = useId()
  const base = cn(
    'peer w-full rounded-xs border bg-transparent px-4 pt-5 pb-2 type-body-l outline-none transition-colors',
    error ? 'border-error' : 'border-outline focus:border-primary focus:border-2',
  )
  return (
    <div className={cn('relative', className)}>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder=" "
          rows={3}
          className={cn(base, 'resize-none')}
          aria-invalid={!!error}
        />
      ) : (
        <input id={id} value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} placeholder=" " className={base} aria-invalid={!!error} {...rest} />
      )}
      <label
        htmlFor={id}
        className={cn(
          'pointer-events-none absolute top-1.5 left-4 type-body-s transition-all',
          error ? 'text-error' : 'text-on-surface-variant peer-focus:text-primary',
        )}
      >
        {label}
      </label>
      <div className="mt-1 flex justify-between gap-2 px-4 type-body-s">
        <span className={error ? 'text-error' : 'text-on-surface-variant'} role={error ? 'alert' : undefined}>
          {error ?? hint ?? ''}
        </span>
        {maxLength !== undefined && (
          <span className="text-on-surface-variant">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  )
}
