# `progress-bar`

> simple progress bar
> ![](https://pasteboard.co/JJnbF3rTUEss.png)

## Usage

```
import { ProgressBar } from '../progress-bar';

    const progressBar = new ProgressBar({ identifier: 'test', total: 10 });
    for (let i = 0; i < 10; i++) {
      progressBar.tick();
    }

```
