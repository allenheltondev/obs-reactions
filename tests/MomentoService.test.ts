import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { MomentoService } from '../src/services/MomentoService';
import type { Reaction } from '../src/types/reactions';

const mockFetch = vi.fn();
(globalThis as Record<string, unknown>).fetch = mockFetch;

vi.mock('../src/types/environment', () => ({
  getEnvironmentConfig: () => ({
    VITE_MOMENTO_API_KEY: 'test-api-key',
    VITE_MOMENTO_ENDPOINT: 'https://test-momento-url.com',
    VITE_MOMENTO_CACHE_NAME: 'test-cache'
  })
}));

describe('MomentoService', () => {
  let service: MomentoService;

  beforeEach(() => {
    service = new MomentoService();
    mockFetch.mockClear();
  });

  afterEach(() => {
    service.disconnect();
  });

  it('should publish reactions with correct structure', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK'
    });

    const reactionArbitrary = fc.record({
      emojiType: fc.constantFrom('heart', '100', 'thumbsup', 'clap', 'fire', 'mindblown'),
      senderId: fc.string({ minLength: 1, maxLength: 50 })
    });

    await fc.assert(
      fc.asyncProperty(reactionArbitrary, async (reaction: Reaction) => {
        const sessionId = 'test-session';

        await service.publish(sessionId, reaction);

        expect(mockFetch).toHaveBeenCalledWith(
          `https://test-momento-url.com/topics/test-cache/${sessionId}`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'test-api-key',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(reaction),
          }
        );

        const callArgs = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        const messageBody = JSON.parse(callArgs[1].body);

        expect(messageBody).toHaveProperty('emojiType');
        expect(messageBody).toHaveProperty('senderId');
        expect(typeof messageBody.emojiType).toBe('string');
        expect(typeof messageBody.senderId).toBe('string');

        mockFetch.mockClear();
      }),
      { numRuns: 20 }
    );
  });

  it('should isolate sessions correctly', () => {
    const sessionIdArbitrary = fc.string({ minLength: 1, maxLength: 20 });

    fc.assert(
      fc.property(
        fc.tuple(sessionIdArbitrary, sessionIdArbitrary).filter(([s1, s2]) => s1 !== s2),
        ([sessionId1, sessionId2]) => {
          mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK'
          });

          const reaction1: Reaction = {
            emojiType: 'heart',
            senderId: 'sender1'
          };

          const reaction2: Reaction = {
            emojiType: 'fire',
            senderId: 'sender2'
          };

          service.publish(sessionId1, reaction1);
          service.publish(sessionId2, reaction2);

          const calls = mockFetch.mock.calls;
          expect(calls.length).toBe(2);

          expect(calls[0][0]).toBe(`https://test-momento-url.com/topics/test-cache/${sessionId1}`);
          expect(calls[1][0]).toBe(`https://test-momento-url.com/topics/test-cache/${sessionId2}`);

          mockFetch.mockClear();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle invalid message formats gracefully', () => {
    const invalidMessageArbitrary = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.string(),
      fc.integer(),
      fc.record({
        emojiType: fc.oneof(fc.constant(null), fc.integer(), fc.constant(undefined)),
        senderId: fc.oneof(fc.constant(null), fc.integer(), fc.constant(undefined))
      })
    );

    fc.assert(
      fc.property(invalidMessageArbitrary, (invalidMessage) => {
        const isValid = (service as any).isValidReaction(invalidMessage);
        expect(isValid).toBe(false);
      }),
      { numRuns: 50 }
    );
  });
});
