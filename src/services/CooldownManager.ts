export interface CooldownState {
  globalCooldown: number;
}

export interface StoredCooldownData {
  senderId: string;
  cooldowns: CooldownState;
}

export class CooldownManager {
  private static readonly COOLDOWN_DURATION_MS = 3000;
  private static readonly STORAGE_KEY = 'animated-reactions-cooldown';
  private static readonly SENDER_ID_KEY = 'animated-reactions-sender-id';

  private senderId: string;
  private globalCooldownExpiration: number = 0;

  constructor() {
    this.senderId = this.initializeSenderId();
    this.loadCooldownState();
    this.startCleanupTimer();
  }

  isOnCooldown(senderId: string): boolean {
    if (senderId !== this.senderId) {
      return false;
    }

    const now = Date.now();
    if (now >= this.globalCooldownExpiration) {
      this.globalCooldownExpiration = 0;
      this.saveCooldownState();
      return false;
    }

    return true;
  }

  setCooldown(senderId: string): void {
    if (senderId !== this.senderId) {
      return;
    }

    this.globalCooldownExpiration = Date.now() + CooldownManager.COOLDOWN_DURATION_MS;
    this.saveCooldownState();
  }

  getRemainingTime(senderId: string): number {
    if (senderId !== this.senderId) {
      return 0;
    }

    const now = Date.now();
    const remaining = this.globalCooldownExpiration - now;

    if (remaining <= 0) {
      this.globalCooldownExpiration = 0;
      this.saveCooldownState();
      return 0;
    }

    return remaining;
  }

  getSenderId(): string {
    return this.senderId;
  }

  resetSenderId(): string {
    this.senderId = this.generateUniqueSenderId();
    return this.senderId;
  }

  cleanup(): void {
    const now = Date.now();
    if (now >= this.globalCooldownExpiration) {
      this.globalCooldownExpiration = 0;
      this.saveCooldownState();
    }
  }

  getAllCooldowns(): number {
    this.cleanup();
    return this.globalCooldownExpiration;
  }

  private initializeSenderId(): string {
    try {
      const storedSenderId = localStorage.getItem(CooldownManager.SENDER_ID_KEY);
      if (storedSenderId && typeof storedSenderId === 'string' && storedSenderId.length > 0) {
        return storedSenderId;
      }

      const stored = localStorage.getItem(CooldownManager.STORAGE_KEY);
      if (stored) {
        const data: StoredCooldownData = JSON.parse(stored);
        if (data.senderId && typeof data.senderId === 'string' && data.senderId.length > 0) {
          localStorage.setItem(CooldownManager.SENDER_ID_KEY, data.senderId);
          return data.senderId;
        }
      }
    } catch (error) {
      console.error('Error loading sender ID from storage:', error);
    }

    return this.generateUniqueSenderId();
  }

  private generateUniqueSenderId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const senderId = `sender_${timestamp}_${randomPart}`;

    try {
      localStorage.setItem(CooldownManager.SENDER_ID_KEY, senderId);
    } catch (error) {
      console.error('Error saving sender ID to storage:', error);
    }

    this.saveCooldownState();
    return senderId;
  }

  private loadCooldownState(): void {
    try {
      const stored = localStorage.getItem(CooldownManager.STORAGE_KEY);
      if (stored) {
        const data: StoredCooldownData = JSON.parse(stored);

        if (data.cooldowns && typeof data.cooldowns.globalCooldown === 'number') {
          const now = Date.now();
          if (data.cooldowns.globalCooldown > now) {
            this.globalCooldownExpiration = data.cooldowns.globalCooldown;
          }
        }
      }
    } catch (error) {
      console.error('Error loading cooldown state from storage:', error);
    }
  }

  private saveCooldownState(): void {
    try {
      const data: StoredCooldownData = {
        senderId: this.senderId,
        cooldowns: {
          globalCooldown: this.globalCooldownExpiration,
        },
      };

      localStorage.setItem(CooldownManager.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving cooldown state to storage:', error);
    }
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanup();
    }, 5000);
  }
}

export const cooldownManager = new CooldownManager();
