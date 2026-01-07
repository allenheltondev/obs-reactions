import React from 'react';

interface ErrorPageProps {
  message?: string;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  message = "Session ID is required. Please use a valid URL format."
}) => {
  return (
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
      <h1 style={{ color: '#d32f2f', marginBottom: '20px' }}>Error</h1>
      <p style={{ color: '#666', marginBottom: '30px', maxWidth: '500px' }}>
        {message}
      </p>
      <div style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        maxWidth: '600px'
      }}>
        <h3 style={{ marginBottom: '15px', color: '#333' }}>Valid URL formats:</h3>
        <ul style={{ textAlign: 'left', color: '#666' }}>
          <li><strong>Overlay page:</strong> /{'{sessionId}'}</li>
          <li><strong>Control page:</strong> /reactions/{'{sessionId}'}</li>
        </ul>
        <p style={{ marginTop: '15px', fontSize: '14px', color: '#999' }}>
          Replace {'{sessionId}'} with your actual session identifier.
        </p>
      </div>
    </div>
  );
};
