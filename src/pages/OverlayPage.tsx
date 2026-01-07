import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { momentoService } from '../services/MomentoService';
import type { Reaction, ReactionAnimation } from '../types/reactions';
import { EMOJI_MAP, isValidEmojiType } from '../types/reactions';
import { AnimatedEmoji, ErrorBoundary } from '../components';
import { isValidSessionId, getSessionValidationErrorMessage } from '../utils/sessionValidation';
import { getEnvironmentConfig } from '../types/environment';
import styles from './OverlayPage.module.css';

export const OverlayPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [reactions, setReactions] = useState<ReactionAnimation[]>([]);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [senderCooldowns, setSenderCooldowns] = useState<Map<string, number>>(new Map());

  const config = getEnvironmentConfig();

  useEffect(() => {
    document.title = `${config.VITE_EVENT_NAME} - Overlay`;
  }, [config.VITE_EVENT_NAME]);

  useEffect(() => {
    const validateSession = () => {
      if (!isValidSessionId(sessionId)) {
        setSessionError(getSessionValidationErrorMessage(sessionId));
        return;
      }
      setSessionError(null);
    };

    validateSession();
  }, [sessionId]);

  const handleReactionMessage = useCallback((reaction: Reaction) => {
    if (!isValidEmojiType(reaction.emojiType)) {
      return;
    }

    const now = Date.now();
    const senderId = reaction.senderId;
    const cooldownDuration = 3000; // 3 seconds

    // Check if sender is on cooldown
    const lastReactionTime = senderCooldowns.get(senderId) || 0;
    if (now - lastReactionTime < cooldownDuration) {
      return; // Ignore reaction if sender is on cooldown
    }

    // Update sender cooldown
    setSenderCooldowns(prev => new Map(prev.set(senderId, now)));

    const animation: ReactionAnimation = {
      id: `${reaction.senderId}-${Math.random()}`,
      emoji: EMOJI_MAP[reaction.emojiType],
      startPosition: Math.random() * 90 + 5,
      rotation: Math.random() * 720 - 360,
      startTime: Date.now()
    };

    setReactions(prev => {
      const newReactions = [...prev, animation];
      return newReactions;
    });

    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== animation.id));
    }, 3500);
  }, [senderCooldowns]);

  // Cleanup old cooldown entries periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const cooldownDuration = 3000;

      setSenderCooldowns(prev => {
        const cleaned = new Map();
        for (const [senderId, timestamp] of prev.entries()) {
          if (now - timestamp < cooldownDuration * 2) { // Keep for 2x cooldown duration
            cleaned.set(senderId, timestamp);
          }
        }
        return cleaned;
      });
    }, 10000); // Cleanup every 10 seconds

    return () => clearInterval(cleanupInterval);
  }, []);

  useEffect(() => {
    if (!sessionId || sessionError) return;

    const connectToMomento = async () => {
      try {
        await momentoService.subscribe(sessionId, handleReactionMessage);
      } catch (error) {
        console.error('Failed to connect to Momento:', error);
      }
    };

    connectToMomento();

    return () => {
      momentoService.disconnect();
    };
  }, [sessionId, sessionError, handleReactionMessage]);

  if (sessionError) {
    return (
      <div className={styles.errorContainer}>
        <h3 className={styles.errorTitle}>Session Error</h3>
        <p className={styles.errorMessage}>{sessionError}</p>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className={styles.errorContainer}>
        <h3 className={styles.errorTitle}>Error</h3>
        <p className={styles.errorMessage}>Session ID is required</p>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <div className={styles.errorContainer}>
          <h3 className={styles.errorTitle}>Overlay Error</h3>
          <p className={styles.errorMessage}>The overlay encountered an error. Please refresh the page.</p>
        </div>
      }
    >
      <div className={styles.container}>
        <div className={styles.reactionsContainer}>
          {reactions.map(reaction => {
            return (
              <AnimatedEmoji
                key={reaction.id}
                emoji={reaction.emoji}
                startPosition={reaction.startPosition}
                rotation={reaction.rotation}
                onComplete={() => {
                  setReactions(prev => prev.filter(r => r.id !== reaction.id));
                }}
              />
            );
          })}
        </div>
      </div>
    </ErrorBoundary>
  );
};
