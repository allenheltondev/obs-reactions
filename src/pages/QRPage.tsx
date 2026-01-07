import { useMemo, useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { momentoService } from '../services/MomentoService';
import type { Reaction } from '../types/reactions';
import { EMOJI_MAP, type EmojiType } from '../types/reactions';
import { useReactionSubscription } from '../hooks';
import { getEnvironmentConfig } from '../types/environment';
import styles from './QRPage.module.css';

export const QRPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [reactionCounts, setReactionCounts] = useState<Record<EmojiType, number>>({
    heart: 0,
    '100': 0,
    thumbsup: 0,
    clap: 0,
    fire: 0,
    mindblown: 0
  });

  const config = getEnvironmentConfig();

  const handleReactionReceived = async (reaction: Reaction) => {
    try {
      const newCounts = await momentoService.incrementReactionCount(sessionId!, reaction.emojiType as EmojiType);
      setReactionCounts(newCounts);
    } catch (error) {
      console.error('Failed to update reaction count:', error);
    }
  };

  const handleResetReceived = useCallback(async () => {
    if (!sessionId) return;

    try {
      await momentoService.resetReactionCounts(sessionId);
      setReactionCounts({
        heart: 0,
        '100': 0,
        thumbsup: 0,
        clap: 0,
        fire: 0,
        mindblown: 0
      });
    } catch (error) {
      console.error('Failed to reset reaction counts:', error);
    }
  }, [sessionId]);

  const { sessionError } = useReactionSubscription({
    sessionId,
    onReactionReceived: handleReactionReceived,
    onResetReceived: handleResetReceived,
    enableCooldownTracking: true
  });

  useEffect(() => {
    document.title = `${config.VITE_EVENT_NAME} - QR Code`;
  }, [config.VITE_EVENT_NAME]);

  useEffect(() => {
    if (!sessionId || sessionError) return;

    const loadInitialCounts = async () => {
      try {
        const counts = await momentoService.getReactionCounts(sessionId);
        setReactionCounts(counts);
      } catch (error) {
        console.error('Failed to load initial reaction counts:', error);
      }
    };

    loadInitialCounts();
  }, [sessionId, sessionError]);

  const qrCodeUrl = useMemo(() => {
    if (!sessionId) return '';

    const baseUrl = `${window.location.protocol}//${window.location.host}`;
    const reactionsUrl = `${baseUrl}/reactions/${sessionId}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(reactionsUrl)}`;
  }, [sessionId]);

  if (sessionError) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h1>Session Error</h1>
          <p>{sessionError}</p>
        </div>
      </div>
    );
  }

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
          <div className={styles.emojiRow}>
            {(Object.keys(EMOJI_MAP) as EmojiType[]).map((emojiType) => (
              <div key={emojiType} className={styles.emojiStat}>
                <span className={styles.emoji}>{EMOJI_MAP[emojiType]}</span>
                <span className={styles.count}>{reactionCounts[emojiType]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
