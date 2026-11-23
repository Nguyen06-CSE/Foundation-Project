import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import { Terminal, ShieldCheck, Cpu, Briefcase } from 'lucide-react';
import styles from './docs-ui.module.css';

interface RoadmapStep {
  number: string;
  title: string;
  desc: string;
  href: string;
}

interface RoleData {
  id: string;
  label: string;
  icon: React.ReactNode;
  personaSummary: string;
  focusPoint: string;
  steps: RoadmapStep[];
}

const ROLES: RoleData[] = [
  {
    id: 'developer',
    label: 'Lập trình viên (Developer)',
    icon: <Terminal size={16} />,
    personaSummary: 'Dành cho Frontend / Backend Engineers cần cài đặt môi trường, hiểu API contract và nắm quy trình commit/test.',
    focusPoint: 'Trọng tâm: Chạy Localhost 100% offline, cấu hình biến môi trường và tra cứu 128 REST endpoints.',
    steps: [
      {
        number: 'BƯỚC 01',
        title: 'Khởi Chạy Localhost 5 Phút',
        desc: 'Cài đặt và khởi chạy toàn bộ Backend FastAPI + Frontend React mà không cần Internet.',
        href: '/huong-dan-local/khoi-chay-he-thong',
      },
      {
        number: 'BƯỚC 02',
        title: 'Ngăn Xếp Công Nghệ',
        desc: 'FastAPI, Async SQLAlchemy 2.0, React 19, TailwindCSS và PostgreSQL GIN Index.',
        href: '/kien-truc/tong-quan-kien-truc',
      },
      {
        number: 'BƯỚC 03',
        title: 'Tra Cứu 128 API Endpoints',
        desc: 'Danh mục API đầy đủ, quy ước RESTful, chuẩn lỗi và cơ chế xác thực JWT Bearer.',
        href: '/api',
      },
      {
        number: 'BƯỚC 04',
        title: 'Quy Trình Phát Triển',
        desc: 'Quy chuẩn đặt tên nhánh, linting oxlint, kiểm thử pytest và Alembic migrations.',
        href: '/huong-dan-local/cai-dat-moi-truong',
      },
    ],
  },
  {
    id: 'qa',
    label: 'Kiểm thử & QA (Tester)',
    icon: <ShieldCheck size={16} />,
    personaSummary: 'Dành cho QA / Test Engineers cần xác thực các ca kiểm thử, ma trận truy vết và đánh giá chất lượng.',
    focusPoint: 'Trọng tâm: Đối chiếu 6 Use Cases nghiệp vụ, kiểm thử bảo mật OWASP và đo lường khoảng trống kỹ thuật.',
    steps: [
      {
        number: 'BƯỚC 01',
        title: 'Chiến Lược Kiểm Thử',
        desc: 'Mô hình tháp kiểm thử, tự động hóa Unit/Integration test và môi trường mock.',
        href: '/kiem-thu-va-han-che/chien-luoc-va-ke-hoach-kiem-thu',
      },
      {
        number: 'BƯỚC 02',
        title: 'Danh Mục Test Cases',
        desc: 'Bộ test case chi tiết bao phủ Auth, Workspace, Document Share, OCR và Trending.',
        href: '/kiem-thu-va-han-che/kich-ban-kiem-thu',
      },
      {
        number: 'BƯỚC 03',
        title: 'Hướng Dẫn Chạy Test',
        desc: 'Lệnh thực thi Pytest, kiểm tra coverage và xác thực tính ổn định của hệ thống.',
        href: '/kiem-thu-va-han-che/chien-luoc-va-ke-hoach-kiem-thu',
      },
      {
        number: 'BƯỚC 04',
        title: 'Báo Cáo Sửa Lỗi Vận Hành',
        desc: 'Tài liệu phân tích nguyên nhân gốc rễ (RCA) và các bản vá lỗi nghiêm trọng.',
        href: '/kiem-thu-va-han-che/hien-trang-va-gioi-han-he-thong',
      },
    ],
  },
  {
    id: 'architect',
    label: 'Hội Đồng Phản Biện / Architect',
    icon: <Cpu size={16} />,
    personaSummary: 'Dành cho Giảng viên hướng dẫn, Hội đồng chấm đồ án và Solution Architects thẩm định thiết kế.',
    focusPoint: 'Trọng tâm: Mô hình C4 Architecture, 5 quyết định kiến trúc then chốt (ADR) và cơ chế Hybrid Storage R2.',
    steps: [
      {
        number: 'BƯỚC 01',
        title: 'Kiến Trúc C4 & Tổng Thể',
        desc: 'Mô hình Context, Container và Component của hệ thống Thư viện số.',
        href: '/kien-truc/tong-quan-kien-truc',
      },
      {
        number: 'BƯỚC 02',
        title: '5 Hồ Sơ Quyết Định ADR',
        desc: 'Lý giải tại sao chọn FastAPI, Async SQLAlchemy, Cloudflare R2 và SHA-256 Deduplication.',
        href: '/kien-truc/quyet-dinh-kien-truc/ADR-001-LOCAL-STORAGE-ARCHITECTURE',
      },
      {
        number: 'BƯỚC 03',
        title: 'Kiến Trúc Lưu Trữ 11 Chương',
        desc: 'Cơ chế Hybrid R2/Local, chống trùng lặp SHA-256 và vòng đời bảo vệ file.',
        href: '/kien-truc/he-thong-luu-tru-tap-tin',
      },
      {
        number: 'BƯỚC 04',
        title: 'Ma Trận Phân Quyền RBAC',
        desc: 'Mô hình kiểm soát truy cập phân tầng giữa Sinh viên, Giảng viên và Quản trị viên.',
        href: '/tong-quan/pham-vi-san-pham',
      },
    ],
  },
  {
    id: 'pm',
    label: 'Quản Lý Dự Án (PM / PO)',
    icon: <Briefcase size={16} />,
    personaSummary: 'Dành cho Product Owner, Project Manager và các bên liên quan theo dõi tiến độ và phạm vi sản phẩm.',
    focusPoint: 'Trọng tâm: BRD/FRD, 10 phân hệ nghiệp vụ, lộ trình phát triển và báo cáo kiểm toán nợ kỹ thuật.',
    steps: [
      {
        number: 'BƯỚC 01',
        title: 'Phạm Vi & Giới Hạn Dự Án',
        desc: 'Bản đồ In-scope, Out-of-scope và các ràng buộc phi chức năng cốt lõi.',
        href: '/tong-quan/pham-vi-san-pham',
      },
      {
        number: 'BƯỚC 02',
        title: '10 Phân Hệ Tính Năng',
        desc: 'Kho cá nhân, Thư viện mở, Bundle, Chia sẻ link, OCR Preview và View Modes.',
        href: '/tinh-nang',
      },
      {
        number: 'BƯỚC 03',
        title: 'Lộ Trình & Kế Hoạch Backlog',
        desc: 'Kế hoạch phát hành các giai đoạn và danh sách tính năng chờ triển khai.',
        href: '/tong-quan/boi-canh-va-muc-tieu',
      },
      {
        number: 'BƯỚC 04',
        title: 'Báo Cáo Kiểm Toán & Hiện Trạng',
        desc: 'Đánh giá độ sẵn sàng, phân tích nợ kỹ thuật và bảng phân rã công việc.',
        href: '/kiem-thu-va-han-che/hien-trang-va-gioi-han-he-thong',
      },
    ],
  },
];

export const RoleRoadmapTabs: React.FC = () => {
  const [activeRole, setActiveRole] = useState<string>('developer');
  const currentRole = ROLES.find((r) => r.id === activeRole) || ROLES[0];

  return (
    <div className={styles.roleTabsContainer}>
      <div className={styles.tabButtonsRow}>
        {ROLES.map((role) => (
          <button
            key={role.id}
            type="button"
            className={clsx(styles.tabBtn, activeRole === role.id && styles.tabBtnActive)}
            onClick={() => setActiveRole(role.id)}
          >
            {role.icon}
            <span>{role.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.roleSummaryBox}>
        <div className={styles.rolePersonaIcon}>🎯</div>
        <div className={styles.rolePersonaText}>
          <h4>{currentRole.personaSummary}</h4>
          <p>{currentRole.focusPoint}</p>
        </div>
      </div>

      <div className={styles.stepsGrid}>
        {currentRole.steps.map((step, idx) => (
          <Link key={idx} to={step.href} className={styles.stepCard}>
            <div className={stepNumberClass}>{step.number}</div>
            <div className={styles.stepTitle}>{step.title}</div>
            <div className={styles.stepDesc}>{step.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const stepNumberClass = styles.stepNumber;
