import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/** Evita la pantalla en blanco si una pantalla falla al renderizar. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error de render', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="type-title-l emphasized">Algo salió mal en esta pantalla</p>
        <p className="type-body-m max-w-sm text-on-surface-variant">{this.state.error.message}</p>
        <button
          type="button"
          className="morph state h-10 bg-primary px-5 text-on-primary type-label-l"
          onClick={() => {
            this.setState({ error: null })
            window.location.assign('/')
          }}
        >
          Volver al inicio
        </button>
      </div>
    )
  }
}
