import React from 'react';
import Link from '@docusaurus/Link';
import { Rocket, Layers, Zap } from 'lucide-react';
import styles from './docs-ui.module.css';

interface Stat {
  number: string;
  label: string;
}

interface HeroSectionProps {
  badgeText?: string;
  title?: string;
  gradientTitle?: string;
  subtitle?: string;
  stats?: Stat[];
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  badgeText = 'Foundation Project • v2026 • 128 Endpoints',
  title = 'Cổng Thông Tin & Kiến Trúc',
  gradientTitle = 'Thư Viện Số Trực Tuyến',
  subtitle = 'Nền tảng quản lý, lưu trữ và chia sẻ học liệu số phân tầng cho Đại học với kiến trúc FastAPI, PostgreSQL GIN Index, Hybrid Cloudflare R2 Storage và cơ chế chống trùng lặp SHA-256.',
  stats = [
    { number: '10', label: 'Phân Hệ Nghiệp Vụ' },
    { number: '128', label: 'RESTful Endpoints' },
    { number: '28', label: 'Bảng CSDL PostgreSQL' },
    { number: '5', label: 'Quyết Định Kiến Trúc (ADR)' },
  ],
}) => {
  return (
    <div className={styles.heroContainer}>
      <div className={styles.heroBadge}>
        <span className={styles.heroBadgeDot} />
        <span>{badgeText}</span>
      </div>

      <h1 className={styles.heroTitle}>
        {title} <br />
        <span className={styles.heroGradientText}>{gradientTitle}</span>
      </h1>

      <p className={styles.heroSubtitle}>{subtitle}</p>

      <div className={styles.heroActions}>
        <Link to="/LOCAL_DEVELOPMENT_GUIDE" className={styles.btnPrimary}>
          <Rocket size={16} />
          <span>Khởi chạy Local 5 phút</span>
        </Link>
        <Link to="/system-architecture" className={styles.btnSecondary}>
          <Layers size={16} />
          <span>Khám phá Kiến trúc Hệ thống</span>
        </Link>
        <Link to="/api" className={styles.btnSecondary}>
          <Zap size={16} />
          <span>Tra cứu 128 API Endpoints</span>
        </Link>
      </div>

      <div className={styles.heroStatsGrid}>
        {stats.map((stat, idx) => (
          <div key={idx} className={styles.statItem}>
            <div className={styles.statNumber}>{stat.number}</div>
            <div className={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
