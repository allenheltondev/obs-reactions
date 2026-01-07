import React, { useEffect, useRef } from 'react';
import styles from './AnimatedEmoji.module.css';

interface AnimatedEmojiProps {
  emoji: string;
  startPosition: number;
  rotation: number;
  onComplete: () => void;
}

export const AnimatedEmoji: React.FC<AnimatedEmojiProps> = ({
  emoji,
  startPosition,
  rotation,
  onComplete
}) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    element.style.setProperty('--rotation', `${rotation}deg`);

    const cleanup = setTimeout(() => {
      onComplete();
    }, 3500);

    return () => {
      clearTimeout(cleanup);
    };
  }, [startPosition, rotation, onComplete]);

  return (
    <div
      ref={elementRef}
      className={styles.animatedEmoji}
      style={{
        left: `${startPosition}%`,
      }}
    >
      {emoji}
    </div>
  );
};
