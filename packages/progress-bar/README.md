# `progress-bar`

> simple progress bar

![alt-text](https://gcdnb.pbrd.co/images/JJnbF3rTUEss.png?o=1)

## Usage

```
import { ProgressBar } from '../progress-bar';

    const progressBar = new ProgressBar({ identifier: 'test', total: 10 });
    for (let i = 0; i < 10; i++) {
      progressBar.tick();
    }

```
