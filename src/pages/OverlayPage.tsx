import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Reaction, ReactionAnimation } from '../types/reactions';
import { EMOJI_MAP, type EmojiType } from '../types/reactions';
import { AnimatedEmoji, ErrorBoundary } from '../components';
import { useReactionSubscription } from '../hooks';
import { getEnvironmentConfig } from '../types/environment';
import styles from './OverlayPage.module.css';

export const OverlayPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [reactions, setReactions] = useState<ReactionAnimation[]>([]);

  const config = getEnvironmentConfig();

  const handleReactionReceived = (reaction: Reaction) => {
    const animation: ReactionAnimation = {
      id: `${reaction.senderId}-${Math.random()}`,
      emoji: EMOJI_MAP[reaction.emojiType as EmojiType],
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
  };

  const { sessionError } = useReactionSubscription({
    sessionId,
    onReactionReceived: handleReactionReceived,
    enableCooldownTracking: true
  });

  useEffect(() => {
    document.title = `${config.VITE_EVENT_NAME} - Overlay`;
  }, [config.VITE_EVENT_NAME]);

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
