import { EMOJI_MAP, type Reaction } from '../types/reactions';
import { getEnvironmentConfig } from '../types/environment';
import type { TopicResponse } from '../types/momento';

export interface MomentoServiceConfig {
  apiKey: string;
  topicsUrl: string;
  cacheName: string;
}

export type ReactionCallback = (reaction: Reaction) => void;

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
      topicsUrl: envConfig.VITE_MOMENTO_TOPICS_URL,
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
      const response = await fetch(`${this.config.topicsUrl}/topics/${this.config.cacheName}/${sessionId}`, {
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

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  private async startLongPolling(): Promise<void> {
    if (!this.currentSessionId || !this.subscriptionCallback) {
      throw new Error('Session ID and callback must be set before starting long polling');
    }

    while (!this.subscriptionAbortController?.signal.aborted) {
      try {
        const response = await fetch(`${this.config.topicsUrl}/topics/${this.config.cacheName}/${this.currentSessionId}`, {
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
