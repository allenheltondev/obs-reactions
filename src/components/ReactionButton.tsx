import React from 'react';
import type { EmojiType } from '../types/reactions';
import styles from './ReactionButton.module.css';

interface ReactionButtonProps {
  emoji: string;
  emojiType: EmojiType;
  disabled: boolean;
  onPress: (emojiType: EmojiType) => void;
}

export const ReactionButton: React.FC<ReactionButtonProps> = ({
  emoji,
  emojiType,
  disabled,
  onPress,
}) => {
  const handleClick = () => {
    if (!disabled) {
      onPress(emojiType);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`${styles.button} ${disabled ? styles.disabled : ''}`}
    >
      <span className={`${styles.emoji} ${disabled ? styles.disabled : ''}`}>
        {emoji}
      </span>
    </button>
  );
};
