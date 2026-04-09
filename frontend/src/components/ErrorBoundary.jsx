import React from 'react';

/**
 * ErrorBoundary wraps any subtree and catches render-time JavaScript errors.
 * Without this, a crashed child component causes the entire screen to go blank.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught crash:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 space-y-6">
          <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 max-w-md space-y-4">
            <h2 className="text-xl font-bold text-red-400">Something went wrong</h2>
            <p className="text-slate-400 text-sm font-mono break-all">
              {this.state.error?.message || 'Unknown render error'}
            </p>
            <p className="text-slate-500 text-xs">Check the browser console for the full stack trace.</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
              className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-2xl font-bold transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
