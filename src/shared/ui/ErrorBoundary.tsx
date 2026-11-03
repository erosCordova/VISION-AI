import { Component } from 'react';
import type { ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <section className="panel empty-page" role="alert"><h2>No se pudo mostrar este módulo</h2><p>La navegación continúa disponible. Puedes volver a intentarlo.</p><button onClick={() => this.setState({ failed: false })}>Reintentar</button></section> : this.props.children;
  }
}
