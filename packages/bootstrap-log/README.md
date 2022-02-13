# `bootstrap-log`

> get a nice bootstrap log with your configs

![alt text](https://pasteboard.co/bBxdFdWEoesz.png)

## Usage

```
import { BootstrapLog } from '@nest-toolbox/bootstrap-log';

  await app.listen(port, () => {
    const { hostname, environment, database_url } = config();
    BootstrapLog({ config: { environment, hostname, package_json_body: packageBody, database_url, swagger: true } });
  });
```
