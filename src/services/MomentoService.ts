import { EMOJI_MAP, type Reaction, type EmojiType } from '../types/reactions';
import { getEnvironmentConfig } from '../types/environment';
import type { TopicResponse } from '../types/momento';

export interface MomentoServiceConfig {
  apiKey: string;
  endpoint: string;
  cacheName: string;
}

export type ReactionCallback = (reaction: Reaction) => void;
export type ResetCallback = () => void;

export class MomentoService {
  private config: MomentoServiceConfig;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private baseReconnectDelay: number = 1000;
  private maxReconnectDelay: number = 30000;
  private subscriptionAbortController: AbortController | null = null;
  private subscriptionCallback: ReactionCallback | null = null;
  private currentSessionId: string | null = null;

  constructor() {
    const envConfig = getEnvironmentConfig();
    this.config = {
      apiKey: envConfig.VITE_MOMENTO_API_KEY,
      endpoint: envConfig.VITE_MOMENTO_ENDPOINT,
      cacheName: envConfig.VITE_MOMENTO_CACHE_NAME,
    };
  }

  async subscribe(sessionId: string, callback: ReactionCallback): Promise<void> {
    this.currentSessionId = sessionId;
    this.subscriptionCallback = callback;

    if (this.subscriptionAbortController) {
      this.subscriptionAbortController.abort();
    }

    this.subscriptionAbortController = new AbortController();

    try {
      await this.startLongPolling();
      this.isConnected = true;
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('Failed to start subscription:', error);
      this.handleConnectionError();
    }
  }

  async publish(sessionId: string, reaction: Reaction): Promise<void> {
    try {
      const response = await fetch(`${this.config.endpoint}/topics/${this.config.cacheName}/${sessionId}`, {
        method: 'POST',
        headers: {
          'Authorization': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reaction),
      });

      if (!response.ok) {
        throw new Error(`Failed to publish reaction: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error publishing reaction:', error);
      throw error;
    }
  }

  async subscribeToMultipleTopics(topics: string[], callback: ReactionCallback): Promise<void> {
    this.subscriptionCallback = callback;

    if (this.subscriptionAbortController) {
      this.subscriptionAbortController.abort();
    }

    this.subscriptionAbortController = new AbortController();

    try {
      await Promise.all(topics.map(topic => this.startLongPollingForTopic(topic)));
      this.isConnected = true;
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('Failed to start multi-topic subscription:', error);
      this.handleConnectionError();
    }
  }

  disconnect(): void {
    if (this.subscriptionAbortController) {
      this.subscriptionAbortController.abort();
      this.subscriptionAbortController = null;
    }

    this.isConnected = false;
    this.subscriptionCallback = null;
    this.currentSessionId = null;
    this.reconnectAttempts = 0;
  }

  private async startLongPollingForTopic(topicName: string): Promise<void> {
    if (!this.subscriptionCallback) {
      throw new Error('Callback must be set before starting long polling');
    }

    const pollTopic = async () => {
      while (!this.subscriptionAbortController?.signal.aborted) {
        try {
          // Create a timeout controller for 5 minutes
          const timeoutController = new AbortController();
          const timeoutId = setTimeout(() => timeoutController.abort(), 5 * 60 * 1000);

          // Combine the subscription abort signal with timeout
          const combinedSignal = AbortSignal.any([
            this.subscriptionAbortController?.signal,
            timeoutController.signal
          ].filter(Boolean) as AbortSignal[]);

          const response = await fetch(`${this.config.endpoint}/topics/${this.config.cacheName}/${topicName}`, {
            method: 'GET',
            headers: {
              'Authorization': this.config.apiKey,
              'Accept': 'application/json',
            },
            signal: combinedSignal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`Subscription failed for ${topicName}: ${response.status} ${response.statusText}`);
          }

          const data: TopicResponse = await response.json();

          if (data.items && Array.isArray(data.items)) {
            for (const item of data.items) {
              try {
                if (topicName === 'reset') {
                  // For reset topic, just pass a special reset reaction
                  this.subscriptionCallback?.({ emojiType: '', senderId: '', topicName: 'reset' });
                } else {
                  const message = JSON.parse(item.item.value.text);
                  if (this.isValidReaction(message)) {
                    this.subscriptionCallback?.({ ...message, topicName });
                  }
                }
              } catch (error) {
                console.error('Error processing message:', error);
              }
            }
          }

          this.reconnectAttempts = 0;
          this.isConnected = true;

        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            break;
          }

          console.error(`Long polling error for ${topicName}:`, error);
          this.isConnected = false;
          await this.handleConnectionError();
        }
      }
    };

    pollTopic();
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  async getCacheItem(key: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.config.endpoint}/cache/${this.config.cacheName}/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: {
          'Authorization': this.config.apiKey,
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get cache item: ${response.status} ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error('Error getting cache item:', error);
      throw error;
    }
  }

  async setCacheItem(key: string, value: string, ttlSeconds: number = 3600): Promise<void> {
    try {
      const headers: Record<string, string> = {
        'Authorization': this.config.apiKey,
        'Content-Type': 'text/plain',
      };

      const response = await fetch(`${this.config.endpoint}/cache/${this.config.cacheName}/${encodeURIComponent(key)}?ttl_seconds=${ttlSeconds}`, {
        method: 'PUT',
        headers,
        body: value,
      });

      if (!response.ok) {
        throw new Error(`Failed to set cache item: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error setting cache item:', error);
      throw error;
    }
  }

  async deleteCacheItem(key: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.endpoint}/cache/${this.config.cacheName}/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': this.config.apiKey,
        },
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete cache item: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting cache item:', error);
      throw error;
    }
  }

  async flushCache(): Promise<void> {
    try {
      const response = await fetch(`${this.config.endpoint}/cache/${this.config.cacheName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': this.config.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to flush cache: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error flushing cache:', error);
      throw error;
    }
  }

  async getReactionCounts(sessionId: string): Promise<Record<EmojiType, number>> {
    try {
      const countsJson = await this.getCacheItem(`reactions-${sessionId}`);
      if (!countsJson) {
        return {
          heart: 0,
          '100': 0,
          thumbsup: 0,
          clap: 0,
          fire: 0,
          mindblown: 0
        };
      }
      return JSON.parse(countsJson);
    } catch (error) {
      console.error('Error getting reaction counts:', error);
      return {
        heart: 0,
        '100': 0,
        thumbsup: 0,
        clap: 0,
        fire: 0,
        mindblown: 0
      };
    }
  }

  async incrementReactionCount(sessionId: string, emojiType: EmojiType): Promise<Record<EmojiType, number>> {
    try {
      const currentCounts = await this.getReactionCounts(sessionId);
      const newCounts = {
        ...currentCounts,
        [emojiType]: currentCounts[emojiType] + 1
      };
      await this.setCacheItem(`reactions-${sessionId}`, JSON.stringify(newCounts));
      return newCounts;
    } catch (error) {
      console.error('Error incrementing reaction count:', error);
      throw error;
    }
  }

  async resetReactionCounts(sessionId: string): Promise<void> {
    try {
      await this.deleteCacheItem(`reactions-${sessionId}`);
    } catch (error) {
      console.error('Error resetting reaction counts:', error);
      throw error;
    }
  }

  private async startLongPolling(): Promise<void> {
    if (!this.currentSessionId || !this.subscriptionCallback) {
      throw new Error('Session ID and callback must be set before starting long polling');
    }

    while (!this.subscriptionAbortController?.signal.aborted) {
      try {
        const response = await fetch(`${this.config.endpoint}/topics/${this.config.cacheName}/${this.currentSessionId}`, {
          method: 'GET',
          headers: {
            'Authorization': this.config.apiKey,
            'Accept': 'application/json',
          },
          signal: this.subscriptionAbortController?.signal,
        });

        if (!response.ok) {
          throw new Error(`Subscription failed: ${response.status} ${response.statusText}`);
        }

        const data: TopicResponse = await response.json();

        if (data.items && Array.isArray(data.items)) {
          for (const item of data.items) {
            try {
              const message = JSON.parse(item.item.value.text)
              if (this.isValidReaction(message)) {
                this.subscriptionCallback(message);
              }
            } catch (error) {
              console.error('Error processing message:', error);
            }
          }
        }

        this.reconnectAttempts = 0;
        this.isConnected = true;

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          break;
        }

        console.error('Long polling error:', error);
        this.isConnected = false;
        await this.handleConnectionError();
      }
    }
  }

  private async handleConnectionError(): Promise<void> {
    if (this.subscriptionAbortController?.signal.aborted) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached. Giving up.');
      this.disconnect();
      return;
    }

    this.reconnectAttempts++;

    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    await new Promise(resolve => setTimeout(resolve, delay));

    if (!this.subscriptionAbortController?.signal.aborted && this.currentSessionId && this.subscriptionCallback) {
      try {
        await this.startLongPolling();
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }
  }

  private isValidReaction(message: Reaction): boolean {
    return (
      typeof message === 'object' &&
      message !== null &&
      typeof message.emojiType === 'string' &&
      typeof message.senderId === 'string' &&
      message.emojiType in EMOJI_MAP
    );
  }
}

export const momentoService = new MomentoService();
