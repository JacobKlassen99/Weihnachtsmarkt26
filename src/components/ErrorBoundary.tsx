import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6 bg-white">
          <div className="max-w-md w-full rounded-2xl bg-white border border-gray-200 p-6 text-center text-gray-900 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 text-red-700 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {this.props.fallbackTitle || 'Se produjo un problema al cargar esta sección'}
            </h3>

            <p className="text-xs text-gray-600 mb-6 leading-relaxed">
              Ocurrió un error inesperado en la interfaz. Tus datos no se han perdido.
              Puedes reintentar para restablecer la vista.
            </p>

            {this.state.error?.message && (
              <div className="p-3 mb-6 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700 font-mono text-left truncate">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar sección</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
