import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

/**
 * Cấu trúc thanh điều hướng đa tầng (Multi-Sidebar Architecture).
 * Phân tách tài liệu thành 5 không gian theo chủ đề kết nối với Top Navbar:
 * 1. guidesSidebar  : Tổng quan, Hướng dẫn Localhost & Kiến trúc hệ thống
 * 2. featuresSidebar: Đặc tả 7 phân hệ tính năng nghiệp vụ cốt lõi
 * 3. apiDataSidebar : Cơ sở dữ liệu PostgreSQL & Hệ thống RESTful API
 * 4. opsSidebar     : Kiểm thử chất lượng (QA) & Đặc tả yêu cầu nghiệp vụ
 * 5. pmSidebar      : Biểu mẫu chuẩn & Khu vực lưu trữ lịch sử (Archive)
 */
const sidebars: SidebarsConfig = {
  // ── 1. TỔNG QUAN, HƯỚNG DẪN LOCAL & KIẾN TRÚC ────────────────────────
  guidesSidebar: [
    {
      type: 'doc',
      id: 'README',
      label: 'Cổng Giới Thiệu (Portal Hub)',
    },
    {
      type: 'category',
      label: '1. Tổng Quan Dự Án',
      collapsed: false,
      items: [
        'tong-quan/README',
        'tong-quan/boi-canh-va-muc-tieu',
        'tong-quan/pham-vi-san-pham',
        'tong-quan/thuat-ngu',
      ],
    },
    {
      type: 'category',
      label: '2. Hướng Dẫn Vận Hành Cục Bộ',
      collapsed: false,
      items: [
        'huong-dan-local/README',
        'huong-dan-local/cai-dat-moi-truong',
        'huong-dan-local/khoi-chay-he-thong',
        'huong-dan-local/cau-hinh-va-bien-moi-truong',
        'huong-dan-local/xu-ly-su-co-local',
      ],
    },
    {
      type: 'category',
      label: '3. Kiến Trúc Hệ Thống',
      collapsed: false,
      items: [
        'kien-truc/README',
        'kien-truc/tong-quan-kien-truc',
        'kien-truc/backend-fastapi',
        'kien-truc/frontend-react',
        'kien-truc/he-thong-luu-tru-tap-tin',
        'kien-truc/bao-mat-va-phan-quyen',
        {
          type: 'category',
          label: 'Quyết Định Kiến Trúc (ADR)',
          collapsed: true,
          items: [
            'kien-truc/quyet-dinh-kien-truc/ADR-001-LOCAL-STORAGE-ARCHITECTURE',
            'kien-truc/quyet-dinh-kien-truc/ADR-002-DOCUMENT-CLONING-FORKING',
            'kien-truc/quyet-dinh-kien-truc/ADR-003-POSTGRESQL-FULLTEXT-SEARCH',
            'kien-truc/quyet-dinh-kien-truc/ADR-004-CLIENT-SIDE-DOCUMENT-PREVIEW',
            'kien-truc/quyet-dinh-kien-truc/ADR-005-SHA256-DEDUPLICATION',
          ],
        },
      ],
    },
  ],

  // ── 2. ĐẶC TẢ TÍNH NĂNG NGHIỆP VỤ (FEATURE SPECS) ────────────────────
  featuresSidebar: [
    {
      type: 'doc',
      id: 'tinh-nang/README',
      label: 'Tổng Quan 7 Phân Hệ Tính Năng',
    },
    {
      type: 'category',
      label: '1. Kho Cá Nhân & Quản Lý Tài Liệu',
      collapsed: false,
      items: ['tinh-nang/kho-ca-nhan-va-quan-ly-tai-lieu'],
    },
    {
      type: 'category',
      label: '2. Kho Nhóm & Không Gian Làm Việc',
      collapsed: false,
      items: ['tinh-nang/kho-nhom-va-khong-gian-lam-viec'],
    },
    {
      type: 'category',
      label: '3. Kho Học Liệu Số & Phê Duyệt',
      collapsed: false,
      items: ['tinh-nang/kho-hoc-lieu-va-duyet-tai-lieu'],
    },
    {
      type: 'category',
      label: '4. Tìm Kiếm Toàn Văn & Tra Cứu',
      collapsed: false,
      items: ['tinh-nang/tim-kiem-va-tra-cuu'],
    },
    {
      type: 'category',
      label: '5. Xem Trước & Xử Lý Nội Dung',
      collapsed: false,
      items: ['tinh-nang/xem-truoc-va-xu-ly-noi-dung'],
    },
    {
      type: 'category',
      label: '6. Chia Sẻ & Liên Kết Tài Liệu',
      collapsed: false,
      items: ['tinh-nang/chia-se-va-lien-ket-tai-lieu'],
    },
    {
      type: 'category',
      label: '7. Nhật Ký Hoạt Động & Thống Kê',
      collapsed: false,
      items: ['tinh-nang/nhat-ky-hoat-dong-va-thong-ke'],
    },
  ],

  // ── 3. CƠ SỞ DỮ LIỆU & HỆ THỐNG API (DATA & API) ────────────────────
  apiDataSidebar: [
    {
      type: 'category',
      label: 'Cơ Sở Dữ Liệu PostgreSQL & Alembic',
      collapsed: false,
      items: [
        'co-so-du-lieu/README',
        'co-so-du-lieu/mo-hinh-thuc-the-erd',
        'co-so-du-lieu/tu-dien-du-lieu',
        'co-so-du-lieu/db-schema-map',
        'co-so-du-lieu/alembic-va-tien-hoa-schema',
        'co-so-du-lieu/postgresql-chuyen-sau',
      ],
    },
    {
      type: 'category',
      label: 'Hệ Thống API (FastAPI RESTful)',
      collapsed: false,
      items: [
        'api/README',
        'api/API_CONVENTIONS',
        'api/AUTHENTICATION',
        'api/ERROR_HANDLING',
        'api/API_CATALOG',
      ],
    },
  ],

  // ── 4. KIỂM THỬ, QA & ĐẶC TẢ YÊU CẦU (QA & SPECS) ───────────────────
  opsSidebar: [
    {
      type: 'category',
      label: 'Kiểm Thử & Đảm Bảo Chất Lượng (QA)',
      collapsed: false,
      items: [
        'kiem-thu-va-han-che/README',
        'kiem-thu-va-han-che/chien-luoc-va-ke-hoach-kiem-thu',
        'kiem-thu-va-han-che/kich-ban-kiem-thu',
        'kiem-thu-va-han-che/hien-trang-va-gioi-han-he-thong',
      ],
    },
    {
      type: 'category',
      label: 'Yêu Cầu & Nghiệp Vụ Cốt Lõi',
      collapsed: false,
      items: [
        'requirements/README',
        'requirements/BUSINESS_REQUIREMENTS',
        'requirements/FUNCTIONAL_REQUIREMENTS',
        'requirements/NON_FUNCTIONAL_REQUIREMENTS',
        'requirements/BUSINESS_RULES',
        {
          type: 'category',
          label: 'Luồng Nghiệp Vụ (Use Cases)',
          collapsed: true,
          items: [
            'requirements/use-cases/README',
            'requirements/use-cases/UC01_UPLOAD_AND_DEDUPLICATION',
            'requirements/use-cases/UC02_COMMUNITY_SUBMISSION_AND_APPROVAL',
            'requirements/use-cases/UC03_DOCUMENT_FORKING_AND_SHARING',
            'requirements/use-cases/UC04_FULLTEXT_SEARCH_AND_PREVIEW',
            'requirements/use-cases/UC05_TRASH_LIFECYCLE_AND_PURGE',
            'requirements/use-cases/UC06_GROUP_WORKSPACE_COLLABORATION',
          ],
        },
      ],
    },
  ],

  // ── 5. QUY CHUẨN, BIỂU MẪU & KHU LƯU TRỮ (TEMPLATES & ARCHIVE) ─────
  pmSidebar: [
    {
      type: 'category',
      label: 'Quy Chuẩn & Biểu Mẫu (Templates)',
      collapsed: false,
      items: [
        'tinh-nang/template-tai-lieu-tinh-nang',
        'templates/ADR_TEMPLATE',
        'templates/TEST_CASE_TEMPLATE',
      ],
    },
    {
      type: 'category',
      label: 'Khu Lưu Trữ Lịch Sử (Archive)',
      collapsed: true,
      items: [
        {
          type: 'category',
          label: '1. Triển Khai Cloud Cũ (Historical)',
          collapsed: true,
          items: [
            'luu-tru/deployment-cu/README',
            'luu-tru/deployment-cu/DEPLOYMENT_GUIDE',
            'luu-tru/deployment-cu/ENVIRONMENT_CONFIGURATION',
            'luu-tru/deployment-cu/ENV_VARIABLES',
            'luu-tru/deployment-cu/STORAGE_R2',
            'luu-tru/deployment-cu/RELEASE_AND_ROLLBACK',
            'luu-tru/deployment-cu/TROUBLESHOOTING',
            'luu-tru/deployment-cu/BUG_FIX_REPORT',
          ],
        },
        {
          type: 'category',
          label: '2. Tài Liệu Dự Án Cũ',
          collapsed: true,
          items: [
            'luu-tru/tai-lieu-du-an-cu/MoTaDuAn',
            'luu-tru/tai-lieu-du-an-cu/roadmap',
            'luu-tru/tai-lieu-du-an-cu/backlog',
            'luu-tru/tai-lieu-du-an-cu/mau-slide-thuyet-trinh',
            'luu-tru/tai-lieu-du-an-cu/DOCUMENTATION_GUIDE',
          ],
        },
        {
          type: 'category',
          label: '3. Phân Rã Công Việc & Báo Cáo',
          collapsed: true,
          items: [
            'luu-tru/phan-ra-cong-viec/PhanRaChucNang',
            'luu-tru/phan-ra-cong-viec/BoSung-PhanRaChucNang',
            'luu-tru/bao-cao/PROJECT_STATUS_REPORT',
            'luu-tru/bao-cao/AUDIT_REPORT',
            'luu-tru/bao-cao/ACTIVITY_TRACKING',
          ],
        },
      ],
    },
  ],
};

export default sidebars;
