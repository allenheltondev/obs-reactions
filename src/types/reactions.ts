export interface Reaction {
  emojiType: string;
  senderId: string;
}

export interface ReactionAnimation {
  id: string;
  emoji: string;
  startPosition: number;
  rotation: number;
  startTime: number;
}

export interface EmojiMapping {
  [key: string]: string;
}

export const EMOJI_MAP = {
  'heart': '❤️',
  '100': '💯',
  'thumbsup': '👍',
  'clap': '👏',
  'fire': '🔥',
  'mindblown': '🤯'
} as const;

export type EmojiType = keyof typeof EMOJI_MAP;

export const isValidEmojiType = (emojiType: string): emojiType is EmojiType => {
  return emojiType in EMOJI_MAP;
};

export const getEmojiCharacter = (emojiType: EmojiType): string => {
  return EMOJI_MAP[emojiType];
};
