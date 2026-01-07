import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import styles from './QRPage.module.css';

export const QRPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();

  const qrCodeUrl = useMemo(() => {
    if (!sessionId) return '';

    const baseUrl = `${window.location.protocol}//${window.location.host}`;
    const reactionsUrl = `${baseUrl}/reactions/${sessionId}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(reactionsUrl)}`;
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h1>Error</h1>
          <p>Session ID is required</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.qrContainer}>
          <img
            src={qrCodeUrl}
            alt={`QR code for reactions/${sessionId}`}
            className={styles.qrCode}
          />
        </div>
      </div>
    </div>
  );
};
