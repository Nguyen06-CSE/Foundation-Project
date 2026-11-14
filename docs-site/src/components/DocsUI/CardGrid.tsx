import React from 'react';
import clsx from 'clsx';
import styles from './docs-ui.module.css';

interface CardGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}

export const CardGrid: React.FC<CardGridProps> = ({ children, cols = 3, className }) => {
  return (
    <div
      className={clsx(
        styles.cardGrid,
        cols === 2 && styles.cardGridCol2,
        cols === 4 && styles.cardGridCol4,
        className
      )}
    >
      {children}
    </div>
  );
};
