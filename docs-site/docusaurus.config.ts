import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Thư Viện Số - Foundation Project',
  tagline: 'Tài liệu kiến trúc hệ thống, API và hướng dẫn phát triển',
  favicon: 'img/favicon.ico',

  // GitHub Pages deployment
  url: 'https://Nguyen06-CSE.github.io',
  baseUrl: '/Foundation-Project/',

  organizationName: 'Nguyen06-CSE',
  projectName: 'Foundation-Project',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  onBrokenAnchors: 'warn',

  markdown: {
    format: 'detect',
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
      onBrokenMarkdownImages: 'warn',
    },
  },

  themes: [
    '@docusaurus/theme-mermaid',
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        language: ['en'],
        indexDocs: true,
        indexBlog: false,
        indexPages: false,
        docsRouteBasePath: '/',
        searchResultLimits: 8,
        searchResultContextMaxLength: 50,
      },
    ],
  ],

  i18n: {
    defaultLocale: 'vi',
    locales: ['vi'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../docs',           // Trỏ về docs/ ở root
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',        // Docs là trang chủ của site
          editUrl:
            'https://github.com/Nguyen06-CSE/Foundation-Project/tree/main/docs/',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Digital Library Docs',
      logo: {
        alt: 'Foundation Project Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'guidesSidebar',
          position: 'left',
          label: 'Tổng Quan & Kiến Trúc',
        },
        {
          type: 'docSidebar',
          sidebarId: 'featuresSidebar',
          position: 'left',
          label: 'Đặc Tả Tính Năng',
        },
        {
          type: 'docSidebar',
          sidebarId: 'apiDataSidebar',
          position: 'left',
          label: 'API & CSDL',
        },
        {
          type: 'docSidebar',
          sidebarId: 'opsSidebar',
          position: 'left',
          label: 'Vận Hành & Kiểm Thử',
        },
        {
          type: 'docSidebar',
          sidebarId: 'pmSidebar',
          position: 'left',
          label: 'Quản Trị & Quy Chuẩn',
        },
        {
          href: 'https://github.com/Nguyen06-CSE/Foundation-Project',
          label: 'GitHub',
          position: 'right',
          className: 'header-github-link',
        },
      ],
    },
    mermaid: {
      theme: { light: 'neutral', dark: 'dark' },
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Tài Liệu Kỹ Thuật',
          items: [
            { label: 'Cổng Thông Tin (Hub)', to: '/' },
            { label: 'Tổng Quan Dự Án', to: '/tong-quan' },
            { label: 'Hướng Dẫn Localhost', to: '/huong-dan-local' },
            { label: 'Kiến Trúc Hệ Thống', to: '/kien-truc' },
            { label: 'Cơ Sở Dữ Liệu', to: '/co-so-du-lieu' },
          ],
        },
        {
          title: 'Chất Lượng & Nghiệp Vụ',
          items: [
            { label: 'Đặc Tả 7 Tính Năng', to: '/tinh-nang' },
            { label: 'Hệ Thống REST API', to: '/api' },
            { label: 'Kiểm Thử & Đảm Bảo QA', to: '/kiem-thu-va-han-che' },
            { label: 'Đặc Tả Yêu Cầu', to: '/requirements' },
          ],
        },
        {
          title: 'Dự Án & Lưu Trữ',
          items: [
            {
              label: 'GitHub Repository',
              href: 'https://github.com/Nguyen06-CSE/Foundation-Project',
            },
            { label: 'Quy Chuẩn & Biểu Mẫu', to: '/templates/ADR_TEMPLATE' },
            { label: 'Khu Lưu Trữ Lịch Sử', to: '/luu-tru/deployment-cu' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Foundation Project Team. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['python', 'bash', 'sql', 'typescript', 'yaml', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
