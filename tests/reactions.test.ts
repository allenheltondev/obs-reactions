import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  EMOJI_MAP,
  isValidEmojiType,
  getEmojiCharacter,
  type EmojiType
} from '../src/types/reactions';

describe('Reaction Data Models', () => {
  it('should map emoji types to correct Unicode characters', () => {
    const supportedEmojiTypes = Object.keys(EMOJI_MAP) as EmojiType[];
    const emojiTypeArbitrary = fc.constantFrom(...supportedEmojiTypes);

    fc.assert(
      fc.property(emojiTypeArbitrary, (emojiType) => {
        expect(isValidEmojiType(emojiType)).toBe(true);

        const expectedEmoji = EMOJI_MAP[emojiType];
        const actualEmoji = getEmojiCharacter(emojiType);
        expect(actualEmoji).toBe(expectedEmoji);

        expect(typeof expectedEmoji).toBe('string');
        expect(expectedEmoji.length).toBeGreaterThan(0);

        const otherTypes = supportedEmojiTypes.filter(t => t !== emojiType);
        const otherEmojis = otherTypes.map(t => EMOJI_MAP[t]);
        expect(otherEmojis).not.toContain(expectedEmoji);
      }),
      { numRuns: 50 }
    );
  });

  it('should reject invalid emoji types', () => {
    const invalidStringArbitrary = fc.string().filter(s => !(s in EMOJI_MAP));

    fc.assert(
      fc.property(invalidStringArbitrary, (invalidType) => {
        expect(isValidEmojiType(invalidType)).toBe(false);
      }),
      { numRuns: 50 }
    );
  });

  it('should have all expected emoji mappings', () => {
    const expectedTypes = ['heart', '100', 'thumbsup', 'clap', 'fire', 'mindblown'];
    const expectedEmojis = ['❤️', '💯', '👍', '👏', '🔥', '🤯'];

    expectedTypes.forEach((type, index) => {
      expect(EMOJI_MAP[type as EmojiType]).toBe(expectedEmojis[index]);
      expect(isValidEmojiType(type)).toBe(true);
      expect(getEmojiCharacter(type as EmojiType)).toBe(expectedEmojis[index]);
    });
  });
});
