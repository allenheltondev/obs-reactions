import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { momentoService } from '../services/MomentoService';
import { cooldownManager } from '../services/CooldownManager';
import { ReactionButton, ErrorBoundary } from '../components';
import { EMOJI_MAP, type EmojiType, type Reaction } from '../types/reactions';
import { isValidSessionId, getSessionValidationErrorMessage } from '../utils/sessionValidation';
import { getEnvironmentConfig } from '../types/environment';
import styles from './ControlPage.module.css';

export const ControlPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isOnGlobalCooldown, setIsOnGlobalCooldown] = useState(false);
  const [globalCooldownRemaining, setGlobalCooldownRemaining] = useState(0);

  const config = getEnvironmentConfig();

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

  useEffect(() => {
    document.title = `Reactions | ${config.VITE_EVENT_NAME}`;
  }, [config.VITE_EVENT_NAME]);

  useEffect(() => {
    if (!sessionId || sessionError) return;

    const initializeService = () => {
      cooldownManager.getSenderId();
    };

    initializeService();

    const updateCooldowns = () => {
      const currentSenderId = cooldownManager.getSenderId();
      const anyOnCooldown = cooldownManager.isOnCooldown(currentSenderId);

      if (anyOnCooldown) {
        const maxCooldown = cooldownManager.getRemainingTime(currentSenderId);
        setIsOnGlobalCooldown(true);
        setGlobalCooldownRemaining(maxCooldown);
      } else {
        setIsOnGlobalCooldown(false);
        setGlobalCooldownRemaining(0);
      }
    };

    const cooldownInterval = setInterval(updateCooldowns, 100);

    return () => {
      clearInterval(cooldownInterval);
    };
  }, [sessionId, sessionError]);

  const handleReactionPress = async (emojiType: EmojiType) => {
    if (!sessionId || isOnGlobalCooldown) return;

    const currentSenderId = cooldownManager.getSenderId();

    try {
      const reaction: Reaction = {
        emojiType,
        senderId: currentSenderId,
      };

      await momentoService.publish(sessionId, reaction);
      cooldownManager.setCooldown(currentSenderId);

    } catch (error) {
      console.error('Failed to send reaction:', error);
    }
  };

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
          <h3 className={styles.errorTitle}>Control Page Error</h3>
          <p className={styles.errorMessage}>The control page encountered an error. Please refresh the page.</p>
          <button
            onClick={() => window.location.reload()}
            className={styles.refreshButton}
          >
            Refresh Page
          </button>
        </div>
      }
    >
      <div
        className={styles.container}
        style={{
          '--primary': config.VITE_PRIMARY_COLOR,
          '--secondary': config.VITE_SECONDARY_COLOR,
          '--tertiary': config.VITE_TERTIARY_COLOR,
        } as React.CSSProperties}
      >
        <div className={styles.logo}>
          {config.VITE_EVENT_NAME}
        </div>

        <h1 className={styles.title}>🎉 Live Reactions! 🎉</h1>
        <p className={styles.subtitle}>Let your feelings fly across the screen!</p>

        <div className={styles.reactionsGrid}>
          {isOnGlobalCooldown && (
            <div className={styles.globalCooldownOverlay}>
              <div className={styles.cooldownMessage}>
                {Math.ceil(globalCooldownRemaining / 1000)}s
              </div>
            </div>
          )}

          {Object.entries(EMOJI_MAP).map(([emojiType, emoji]) => {
            const typedEmojiType = emojiType as EmojiType;

            return (
              <ReactionButton
                key={emojiType}
                emoji={emoji}
                emojiType={typedEmojiType}
                disabled={isOnGlobalCooldown}
                onPress={handleReactionPress}
              />
            );
          })}
        </div>

        <div className={styles.instructions}>
          <strong>Ready to react? 🚀</strong><br />
          Tap any emoji and watch it soar across everyone's screen!
          There's a quick 3-second cooldown after each reaction to keep the magic flowing smoothly. ✨
        </div>
      </div>
    </ErrorBoundary>
  );
};
