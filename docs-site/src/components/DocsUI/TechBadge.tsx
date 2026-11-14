import React from 'react';
import clsx from 'clsx';
import styles from './docs-ui.module.css';

export type TechBadgeColor = 'indigo' | 'emerald' | 'sky' | 'amber' | 'purple' | 'slate';

interface TechBadgeProps {
  label: string;
  color?: TechBadgeColor;
  className?: string;
}

export const TechBadge: React.FC<TechBadgeProps> = ({ label, color = 'indigo', className }) => {
  const colorClassMap: Record<TechBadgeColor, string> = {
    indigo: styles.techBadgeIndigo,
    emerald: styles.techBadgeEmerald,
    sky: styles.techBadgeSky,
    amber: styles.techBadgeAmber,
    purple: styles.techBadgePurple,
    slate: styles.techBadgeSlate,
  };

  return (
    <span className={clsx(styles.techBadge, colorClassMap[color], className)}>
      {label}
    </span>
  );
};
