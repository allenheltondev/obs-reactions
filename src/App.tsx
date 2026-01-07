import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { OverlayPage, ControlPage, ErrorPage, QRPage } from './pages';
import { ErrorBoundary } from './components';
import { getEnvironmentConfig } from './types/environment';
import { useEffect, useState } from 'react';

function App() {
  const [configError, setConfigError] = useState<string | null>(null);
  const [isConfigValid, setIsConfigValid] = useState(false);

  useEffect(() => {
    const validateConfig = () => {
      try {
        getEnvironmentConfig();
        setIsConfigValid(true);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown configuration error';
        setConfigError(errorMessage);
      }
    };

    validateConfig();
  }, []);

  if (configError) {
    return <ErrorPage message={`Configuration Error: ${configError}`} />;
  }

  if (!isConfigValid) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        Validating configuration...
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          fontFamily: 'Arial, sans-serif',
          textAlign: 'center',
          backgroundColor: '#f5f5f5'
        }}>
          <h1 style={{ color: '#d32f2f', marginBottom: '20px' }}>Application Error</h1>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            The application encountered an unexpected error.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#d32f2f',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Reload Application
          </button>
        </div>
      }
    >
      <Router>
        <Routes>
          <Route path="/:sessionId" element={<OverlayPage />} />
          <Route path="/reactions/:sessionId" element={<ControlPage />} />
          <Route path="/qr/:sessionId" element={<QRPage />} />
          <Route path="/" element={<Navigate to="/reactions/hello-world" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App
