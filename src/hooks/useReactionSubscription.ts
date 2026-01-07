import { useEffect, useState, useCallback } from 'react';
import { momentoService } from '../services/MomentoService';
import type { Reaction } from '../types/reactions';
import { isValidEmojiType } from '../types/reactions';
import { isValidSessionId, getSessionValidationErrorMessage } from '../utils/sessionValidation';

export interface UseReactionSubscriptionOptions {
  sessionId: string | undefined;
  onReactionReceived?: (reaction: Reaction) => void;
  onResetReceived?: () => void;
  enableCooldownTracking?: boolean;
}

export interface UseReactionSubscriptionReturn {
  sessionError: string | null;
  isConnected: boolean;
  senderCooldowns: Map<string, number>;
}

export const useReactionSubscription = ({
  sessionId,
  onReactionReceived,
  onResetReceived,
  enableCooldownTracking = true
}: UseReactionSubscriptionOptions): UseReactionSubscriptionReturn => {
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [senderCooldowns, setSenderCooldowns] = useState<Map<string, number>>(new Map());

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

    if (enableCooldownTracking) {
      const now = Date.now();
      const senderId = reaction.senderId;
      const cooldownDuration = 3000;

      const lastReactionTime = senderCooldowns.get(senderId) || 0;
      if (now - lastReactionTime < cooldownDuration) {
        return;
      }

      setSenderCooldowns(prev => new Map(prev.set(senderId, now)));
    }

    onReactionReceived?.(reaction);
  }, [senderCooldowns, enableCooldownTracking, onReactionReceived]);

  useEffect(() => {
    if (!enableCooldownTracking) return;

    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const cooldownDuration = 3000;

      setSenderCooldowns(prev => {
        const cleaned = new Map();
        for (const [senderId, timestamp] of prev.entries()) {
          if (now - timestamp < cooldownDuration * 2) {
            cleaned.set(senderId, timestamp);
          }
        }
        return cleaned;
      });
    }, 10000);

    return () => clearInterval(cleanupInterval);
  }, [enableCooldownTracking]);

  useEffect(() => {
    if (!sessionId || sessionError) {
      setIsConnected(false);
      return;
    }

    const connectToMomento = async () => {
      try {
        if (onResetReceived) {
          // Subscribe to both session topic and reset topic
          await momentoService.subscribeToMultipleTopics([sessionId, 'reset'], (reaction: Reaction) => {
            // Check if this is a reset message (from reset topic)
            if (reaction.topicName === 'reset') {
              onResetReceived();
              return;
            }

            // Otherwise handle as normal reaction
            handleReactionMessage(reaction);
          });
        } else {
          // Just subscribe to session topic for reactions
          await momentoService.subscribe(sessionId, handleReactionMessage);
        }
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to connect to Momento:', error);
        setIsConnected(false);
      }
    };

    connectToMomento();

    return () => {
      momentoService.disconnect();
      setIsConnected(false);
    };
  }, [sessionId, sessionError, handleReactionMessage, onResetReceived]);

  return {
    sessionError,
    isConnected,
    senderCooldowns
  };
};
