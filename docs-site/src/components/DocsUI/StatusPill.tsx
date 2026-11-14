import React from 'react';
import clsx from 'clsx';
import styles from './docs-ui.module.css';

interface StatusPillProps {
  label: string;
  status?: 'success' | 'info';
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  label,
  status = 'success',
  className,
}) => {
  return (
    <span
      className={clsx(
        styles.statusPill,
        status === 'success' && styles.statusPillSuccess,
        status === 'info' && styles.statusPillInfo,
        className
      )}
    >
      <span className={styles.statusDot} />
      <span>{label}</span>
    </span>
  );
};
