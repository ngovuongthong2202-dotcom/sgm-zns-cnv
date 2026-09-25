import React, { ErrorInfo, ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { Button } from './Button';
import { RefreshCw, Flag } from 'lucide-react';
import { BaseRepository } from '@/src/data/repositories/base.repo';

const clientErrorsRepo = new BaseRepository('clientErrors');

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  isReporting: boolean;
  reported: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    isReporting: false,
    reported: false
  };

  private reportTimeout: NodeJS.Timeout | null = null;
  private lastReportedError: string | null = null;
  private isHandlingError = false;

  public componentWillUnmount() {
    if (this.reportTimeout) {
      clearTimeout(this.reportTimeout);
    }
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, isReporting: false, reported: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    try {
      if (error && error.message && error.message.includes('Failed to fetch dynamically imported module')) {
        // Auto-refresh the page once for chunk loading errors
        if (!sessionStorage.getItem('vite-chunk-reload')) {
          sessionStorage.setItem('vite-chunk-reload', 'true');
          window.location.reload();
          return;
        } else {
          sessionStorage.removeItem('vite-chunk-reload');
        }
      }

      console.error('Uncaught error handled by ErrorBoundary:', error, errorInfo);
      if (this.isHandlingError) {
        return;
      }
      this.isHandlingError = true;
      this.autoReportError(error, errorInfo);
    } catch (disaster) {
      console.error('ErrorBoundary critical disaster in componentDidCatch:', disaster);
    }
  }

  private autoReportError = (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errMessage = error?.message || 'Unknown Error';
      
      if (this.lastReportedError === errMessage) return;
      this.lastReportedError = errMessage;

      if (this.reportTimeout) {
        clearTimeout(this.reportTimeout);
      }

      this.reportTimeout = setTimeout(async () => {
        try {
          // // ignored
          this.setState({ isReporting: true });
          
          await clientErrorsRepo.create({ 
            error: errMessage, 
            stack: error?.stack || '', 
            componentStack: errorInfo?.componentStack || '',
            url: window?.location?.href || 'unknown'
          });
          
          // // ignored
          this.setState({ reported: true });
        } catch (e) {
          console.error('Failed to auto-report error:', e);
        } finally {
          try {
            // // ignored
            this.setState({ isReporting: false });
          } catch (setStateError) {
            console.error('ErrorBoundary:', setStateError);
          }
        }
      }, 2000); 
    } catch (outerError) {
      console.error('ErrorBoundary exception in autoReportError setup:', outerError);
    }
  }

  private handleReportError = async () => {
    try {
      if (!this.state.error || this.state.reported) return;
      // // ignored
      this.setState({ isReporting: true });
      
      await clientErrorsRepo.create({ 
        error: this.state.error.message || 'Manual Error', 
        stack: this.state.error.stack || '', 
        url: window?.location?.href || 'unknown' 
      });
      // // ignored
      this.setState({ reported: true });
    } catch (e) {
      console.error('Failed to report error:', e);
    } finally {
      try {
        // // ignored
        this.setState({ isReporting: false });
      } catch (setStateError) {
        console.error('ErrorBoundary:', setStateError);
      }
    }
  };

  public render() {
    if (this.state.hasError) {
      // // ignored
      return this.props.fallback || (
        <div className="w-full h-full p-8 flex items-center justify-center min-h-[50vh]">
          <EmptyState 
            variant="error" 
            title="Đã xảy ra lỗi hệ thống" 
            description={this.state.error?.message || 'Có lỗi bất thường xảy ra trong quá trình hiển thị giao diện.'}
            action={
              <>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="primary"
                  leftIcon={<RefreshCw size={16} />}
                >
                  Tải lại trang
                </Button>
                <Button 
                  onClick={this.handleReportError}
                  variant="secondary"
                  disabled={this.state.isReporting || this.state.reported}
                  leftIcon={<Flag size={16} />}
                >
                  {this.state.reported ? 'Đã báo cáo' : this.state.isReporting ? 'Đang gửi...' : 'Báo cáo lỗi'}
                </Button>
              </>
            }
          />
        </div>
      );
    }

    // // ignored
    return this.props.children;
  }
}

