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
  badgeText = 'Foundation Project • Localhost-First • 26 Bảng CSDL',
  title = 'Cổng Thông Tin & Kiến Trúc',
  gradientTitle = 'Thư Viện Số Trực Tuyến',
  subtitle = 'Nền tảng quản lý, lưu trữ và chia sẻ học liệu số phân tầng cho môi trường Đại học với kiến trúc FastAPI RESTful, CSDL PostgreSQL GIN Index, Lưu trữ cục bộ Local Filesystem và cơ chế khử trùng lặp SHA-256.',
  stats = [
    { number: '3', label: 'Kho Lưu Trữ Cốt Lõi' },
    { number: '7', label: 'Phân Hệ Nghiệp Vụ' },
    { number: '26', label: 'Bảng Dữ Liệu PostgreSQL' },
    { number: '7', label: 'Bản Migration Tuyến Tính' },
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
        <Link to="/huong-dan-local/khoi-chay-he-thong" className={styles.btnPrimary}>
          <Rocket size={16} />
          <span>Khởi chạy Local 5 phút</span>
        </Link>
        <Link to="/kien-truc/tong-quan-kien-truc" className={styles.btnSecondary}>
          <Layers size={16} />
          <span>Khám phá Kiến trúc Hệ thống</span>
        </Link>
        <Link to="/api/API_CATALOG" className={styles.btnSecondary}>
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
