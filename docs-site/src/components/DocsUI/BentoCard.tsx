import React from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import { ArrowRight } from 'lucide-react';
import styles from './docs-ui.module.css';

interface BentoCardProps {
  title: string;
  description: string;
  href: string;
  icon?: React.ReactNode | string;
  badge?: string;
  actionText?: string;
  className?: string;
  external?: boolean;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  title,
  description,
  href,
  icon,
  badge,
  actionText = 'Khám phá ngay',
  className,
  external = false,
}) => {
  return (
    <Link
      to={href}
      className={clsx(styles.bentoCard, className)}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <div className={styles.cardHeader}>
        {icon && (
          <div className={styles.cardIconBox}>
            {typeof icon === 'string' ? <span>{icon}</span> : icon}
          </div>
        )}
        {badge && <span className={styles.cardBadge}>{badge}</span>}
      </div>

      <div className={styles.cardTitle}>{title}</div>
      <div className={styles.cardDescription}>{description}</div>

      <div className={styles.cardFooter}>
        <span>{actionText}</span>
        <ArrowRight size={15} className={styles.arrowIcon} />
      </div>
    </Link>
  );
};
