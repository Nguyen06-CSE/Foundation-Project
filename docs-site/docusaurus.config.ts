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

  themes: ['@docusaurus/theme-mermaid'],

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
          sidebarId: 'mainSidebar',
          position: 'left',
          label: 'Tài Liệu',
        },
        {
          href: 'https://github.com/Nguyen06-CSE/Foundation-Project',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Tài Liệu',
          items: [
            { label: 'Tổng Quan Dự Án', to: '/' },
            { label: 'Hướng Dẫn Phát Triển', to: '/LOCAL_DEVELOPMENT_GUIDE' },
            { label: 'Deployment', to: '/deployment/README' },
          ],
        },
        {
          title: 'Dự Án',
          items: [
            {
              label: 'GitHub Repository',
              href: 'https://github.com/Nguyen06-CSE/Foundation-Project',
            },
            { label: 'Roadmap', to: '/project-management/roadmap' },
            { label: 'Backlog', to: '/project-management/backlog' },
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
