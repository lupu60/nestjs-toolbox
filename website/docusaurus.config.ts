import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'NestJS Toolbox',
  tagline: 'A growing collection of practical NestJS components — TypeORM utilities, logging, access control, and more.',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://lupu60.github.io',
  baseUrl: '/nestjs-toolbox/',

  organizationName: 'lupu60',
  projectName: 'nestjs-toolbox',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/lupu60/nestjs-toolbox/tree/master/website/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'NestJS Toolbox',
      logo: {
        alt: 'NestJS Toolbox',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'packagesSidebar',
          position: 'left',
          label: 'Packages',
        },
        {
          href: 'https://github.com/lupu60/nestjs-toolbox',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://www.npmjs.com/org/nest-toolbox',
          label: 'npm',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Packages',
          items: [
            { label: 'Getting Started', to: '/docs' },
            { label: 'Response Envelope', to: '/docs/packages/response-envelope' },
            { label: 'Request Context', to: '/docs/packages/request-context' },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/lupu60/nestjs-toolbox',
            },
            {
              label: 'npm',
              href: 'https://www.npmjs.com/org/nest-toolbox',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Bogdan Lupu. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
