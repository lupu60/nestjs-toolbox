import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  packagesSidebar: [
    'intro',
    {
      type: 'category',
      label: 'TypeORM Utilities',
      collapsed: false,
      items: [
        'packages/typeorm-audit-log',
        'packages/typeorm-paginate',
        'packages/typeorm-soft-delete',
        'packages/typeorm-upsert',
      ],
    },
    {
      type: 'category',
      label: 'Logging',
      collapsed: false,
      items: [
        'packages/bunyan-logger',
        'packages/winston-logger',
        'packages/http-logger-middleware',
        'packages/bootstrap-log',
      ],
    },
    {
      type: 'category',
      label: 'Utilities',
      collapsed: false,
      items: [
        'packages/access-control',
        'packages/request-context',
        'packages/response-envelope',
        'packages/open-api-spec-to-ts',
        'packages/version-generator',
        'packages/progress-bar',
      ],
    },
  ],
};

export default sidebars;
