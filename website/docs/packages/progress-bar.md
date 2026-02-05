---
sidebar_label: "progress-bar"
---

# @nest-toolbox/progress-bar

[![npm version](https://badge.fury.io/js/%40nest-toolbox%2Fprogress-bar.svg)](https://www.npmjs.com/package/@nest-toolbox/progress-bar)

A simple, colorful progress bar for long-running tasks in NestJS applications, built on top of the NestJS `Logger`.

![Progress bar example](https://gcdnb.pbrd.co/images/JJnbF3rTUEss.png?o=1)

## Installation

```bash
npm install @nest-toolbox/progress-bar
```

## Quick Start

```typescript
import { ProgressBar } from '@nest-toolbox/progress-bar';

const progressBar = new ProgressBar({ identifier: 'data-import', total: 100 });

for (let i = 0; i < 100; i++) {
  await processItem(items[i]);
  progressBar.tick();
}
```

Output:

```
[progress_data-import] data-import [====================================    ] 90%
[progress_data-import] data-import [========================================] 100%
```

## Features

- 📊 **Visual progress** — ASCII progress bar with percentage display
- 🎨 **Color-coded** — yellow below 70%, green at 70% and above
- 📝 **NestJS Logger integration** — uses the built-in `@nestjs/common` Logger
- 🔇 **Smart throttling** — only logs when progress changes by more than 5%, reducing noise
- 🏷️ **Named instances** — identify multiple concurrent progress bars via `identifier`
- 📈 **Public progress value** — read `progress` property (0–1) for programmatic access

## API Reference

### `ProgressBar`

#### Constructor

```typescript
new ProgressBar(options: { identifier: string; total: number })
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `identifier` | `string` | A label for this progress bar, used in log output and the logger context (`progress_{identifier}`) |
| `total` | `number` | The total number of steps to completion |

#### `tick()`

Advance the progress bar by one step. Logs progress to the console when the change exceeds 5% or when reaching 100%.

```typescript
progressBar.tick();
```

#### `progress`

Public property — the current progress as a number between `0` and `1`.

```typescript
const pct = progressBar.progress;
// → 0.75 (75% complete)
```

### Log Behavior

The progress bar uses NestJS's `Logger` with context `progress_{identifier}`. It throttles output so that logs are only emitted when:

1. Progress changes by **more than 5%** since the last log, OR
2. The task reaches **100% completion**

This prevents flooding your logs during fast iterations while still giving clear visibility into long-running tasks.

### Color Coding

| Progress | Color |
|----------|-------|
| < 70% | 🟡 Yellow |
| ≥ 70% | 🟢 Green |

## Examples

### Database seeding

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ProgressBar } from '@nest-toolbox/progress-bar';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  async seed(records: SeedRecord[]) {
    this.logger.log(`Seeding ${records.length} records...`);

    const progress = new ProgressBar({
      identifier: 'db-seed',
      total: records.length,
    });

    for (const record of records) {
      await this.repository.save(record);
      progress.tick();
    }

    this.logger.log('Seeding complete!');
  }
}
```

### Batch processing with multiple bars

```typescript
import { ProgressBar } from '@nest-toolbox/progress-bar';

async function processBatches(users: User[], orders: Order[]) {
  const userBar = new ProgressBar({ identifier: 'users', total: users.length });
  const orderBar = new ProgressBar({ identifier: 'orders', total: orders.length });

  // Process users
  for (const user of users) {
    await syncUser(user);
    userBar.tick();
  }

  // Process orders
  for (const order of orders) {
    await syncOrder(order);
    orderBar.tick();
  }
}
```

### Monitoring progress programmatically

```typescript
import { ProgressBar } from '@nest-toolbox/progress-bar';

const bar = new ProgressBar({ identifier: 'export', total: 500 });

const interval = setInterval(() => {
  if (bar.progress >= 1) {
    clearInterval(interval);
    console.log('Export complete!');
  }
}, 1000);

for (let i = 0; i < 500; i++) {
  await exportRecord(i);
  bar.tick();
}
```

### File migration task

```typescript
import { ProgressBar } from '@nest-toolbox/progress-bar';
import * as fs from 'fs';

async function migrateFiles(files: string[]) {
  const progress = new ProgressBar({
    identifier: 'file-migration',
    total: files.length,
  });

  for (const file of files) {
    await uploadToS3(file);
    fs.unlinkSync(file);
    progress.tick();
  }

  console.log(`Migrated ${files.length} files (${(progress.progress * 100).toFixed()}%)`);
}
```
