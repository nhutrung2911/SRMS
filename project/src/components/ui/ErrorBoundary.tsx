import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

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
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center bg-white rounded-xl border border-ink-200 shadow-card">
          <div className="w-12 h-12 rounded-full bg-danger-50 flex items-center justify-center text-danger-600 mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-ink-900 mb-1">
            {this.props.fallbackTitle || 'Something went wrong rendering this section'}
          </h3>
          <p className="text-xs text-ink-500 max-w-md mb-4">
            {this.state.error?.message || 'An unexpected rendering error occurred. Please try again.'}
          </p>
          <Button variant="primary" size="sm" onClick={this.handleReset} icon={<RotateCcw className="w-3.5 h-3.5" />}>
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
