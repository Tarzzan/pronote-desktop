import React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// ─── Utilitaire : ouvrir une Issue GitHub ─────────────────────────────────────
function openGitHubIssue(error: Error, errorInfo: React.ErrorInfo | null): void {
  const GITHUB_REPO = 'pronote-desktop/pronote-desktop'; // ← À remplacer par votre dépôt
  const version = '1.1.0';
  const platform = navigator.platform || 'Linux';

  const title = `[Bug] ${error.message.substring(0, 80)}`;
  const body = [
    '## Description du bug',
    '',
    `Une erreur non capturée s'est produite dans l'application.`,
    '',
    '## Informations système',
    '',
    `| Champ | Valeur |`,
    `|---|---|`,
    `| Version | ${version} |`,
    `| Plateforme | ${platform} |`,
    `| Date | ${new Date().toISOString()} |`,
    '',
    '## Message d\'erreur',
    '',
    '```',
    error.message,
    '```',
    '',
    '## Stack trace',
    '',
    '```',
    error.stack || 'Non disponible',
    '```',
    '',
    errorInfo ? '## Arbre de composants React\n\n```' + errorInfo.componentStack + '\n```' : '',
    '',
    '## Étapes pour reproduire',
    '',
    '1. <!-- Décrivez les étapes pour reproduire le bug -->',
    '2. ',
    '3. ',
    '',
    '## Comportement attendu',
    '',
    '<!-- Décrivez ce qui devrait se passer -->',
  ].join('\n');

  const url = `https://github.com/${GITHUB_REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=bug`;

  // Dans Electron, utiliser shell.openExternal ; dans le navigateur, window.open
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__ELECTRON_SHELL__) {
    const shell = (window as unknown as Record<string, unknown>).__ELECTRON_SHELL__ as { openExternal: (url: string) => void };
    shell.openExternal(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

// ─── Composant ErrorBoundary ──────────────────────────────────────────────────
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    // Logger l'erreur dans la console avec un format structuré
    console.error('[ErrorBoundary] Erreur capturée:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  handleReport = (): void => {
    if (this.state.error) {
      openGitHubIssue(this.state.error, this.state.errorInfo);
    }
  };

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-lg w-full">
            {/* Icône d'erreur */}
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            {/* Titre */}
            <h2 className="text-xl font-bold text-gray-800 dark:text-white text-center mb-2">
              Une erreur inattendue s'est produite
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6">
              L'application a rencontré un problème. Vous pouvez réessayer ou signaler ce bug.
            </p>

            {/* Détail de l'erreur (collapsible) */}
            <details className="mb-6 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <summary className="text-sm font-medium text-red-700 dark:text-red-400 cursor-pointer select-none">
                Détails techniques
              </summary>
              <div className="mt-3">
                <p className="text-xs font-mono text-red-800 dark:text-red-300 break-all">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="mt-2 text-xs text-red-700 dark:text-red-400 overflow-auto max-h-32 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            </details>

            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retour à l'accueil
              </button>
              <button
                onClick={this.handleReport}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
                Signaler sur GitHub
              </button>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">
              Le rapport sera pré-rempli avec les détails techniques de l'erreur.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
