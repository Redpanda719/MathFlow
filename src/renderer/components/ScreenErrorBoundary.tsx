import type { ReactNode } from 'react';
import { Component } from 'react';

interface Props {
  children: ReactNode;
  title: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? 'Unknown error' };
  }

  componentDidCatch(error: Error): void {
    // Keep a console trail for local debugging while showing a user-facing panel.
    // eslint-disable-next-line no-console
    console.error(`[ScreenErrorBoundary:${this.props.title}]`, error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <section className="card">
        <h3>{this.props.title} failed to render</h3>
        <p className="error">{this.state.message}</p>
        <p className="muted">Try going Back and opening another game. If this persists, reload the app.</p>
      </section>
    );
  }
}
