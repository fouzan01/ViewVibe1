import React, { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let message = "Something went wrong.";
      try {
        if (this.state.error && this.state.error.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) message = `Database Error: ${parsed.error}`;
          else message = this.state.error.message;
        } else if (this.state.error) {
          message = String(this.state.error);
        }
      } catch (e) {
        message = this.state.error?.message || "An unexpected error occurred.";
      }

      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
          <div className="glass-card p-8 max-w-md w-full text-center space-y-6 border-rose-500/30">
            <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="text-rose-500" size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">System Error</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                {message}
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              Restart Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
