# `bootstrap-log`

> get a nice bootstrap log with your configs

![alt text](https://gcdnb.pbrd.co/images/bBxdFdWEoesz.png?o=1)

## Usage

```
import { BootstrapLog } from '@nest-toolbox/bootstrap-log';

  await app.listen(port, () => {
    const { hostname, environment, database_url } = config();
    BootstrapLog({ config: { environment, hostname, package_json_body: packageBody, database_url, swagger: true } });
  });
```
