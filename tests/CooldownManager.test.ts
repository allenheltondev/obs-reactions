import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CooldownManager } from '../src/services/CooldownManager';

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('CooldownManager', () => {
  let cooldownManager: CooldownManager;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    cooldownManager = new CooldownManager();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should generate unique sender IDs', () => {
    const manager1 = new CooldownManager();
    const manager2 = new CooldownManager();

    const senderId1 = manager1.getSenderId();
    const senderId2 = manager2.getSenderId();

    expect(senderId1).toBeTruthy();
    expect(senderId2).toBeTruthy();
    expect(senderId1).not.toBe(senderId2);
    expect(senderId1).toMatch(/^sender_/);
    expect(senderId2).toMatch(/^sender_/);
  });

  it('should not be on cooldown initially', () => {
    const senderId = cooldownManager.getSenderId();

    expect(cooldownManager.isOnCooldown(senderId)).toBe(false);
    expect(cooldownManager.getRemainingTime(senderId)).toBe(0);
  });

  it('should set cooldown correctly', () => {
    const senderId = cooldownManager.getSenderId();

    cooldownManager.setCooldown(senderId);

    expect(cooldownManager.isOnCooldown(senderId)).toBe(true);
    expect(cooldownManager.getRemainingTime(senderId)).toBeGreaterThan(0);
    expect(cooldownManager.getRemainingTime(senderId)).toBeLessThanOrEqual(3000);
  });

  it('should only track cooldowns for current sender', () => {
    const currentSenderId = cooldownManager.getSenderId();
    const otherSenderId = 'other-sender-id';

    cooldownManager.setCooldown(currentSenderId);

    expect(cooldownManager.isOnCooldown(currentSenderId)).toBe(true);
    expect(cooldownManager.isOnCooldown(otherSenderId)).toBe(false);
    expect(cooldownManager.getRemainingTime(otherSenderId)).toBe(0);
  });

  it('should save to localStorage when setting cooldown', () => {
    const senderId = cooldownManager.getSenderId();

    cooldownManager.setCooldown(senderId);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'animated-reactions-cooldown',
      expect.stringContaining(senderId)
    );
  });

  it('should cleanup expired cooldowns', () => {
    vi.useFakeTimers();

    const senderId = cooldownManager.getSenderId();

    cooldownManager.setCooldown(senderId);
    expect(cooldownManager.isOnCooldown(senderId)).toBe(true);

    vi.advanceTimersByTime(3100);

    expect(cooldownManager.isOnCooldown(senderId)).toBe(false);
    expect(cooldownManager.getRemainingTime(senderId)).toBe(0);

    vi.useRealTimers();
  });
});
