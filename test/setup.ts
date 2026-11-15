import { beforeEach } from 'vitest';

// Loggers under test write straight to stdout/stderr, which bypasses Vitest's console capture.
// Hold that output back for each test and replay it only if the test fails.
const streams = [process.stdout, process.stderr];

beforeEach(({ onTestFailed }) => {
  const held: Array<() => void> = [];

  const restores = streams.map((stream) => {
    const original = stream.write;
    stream.write = ((...args: unknown[]) => {
      held.push(() => Reflect.apply(original, stream, args));
      const callback = args.at(-1);
      if (typeof callback === 'function') {
        callback();
      }
      return true;
    }) as typeof stream.write;
    return () => {
      stream.write = original;
    };
  });

  onTestFailed(() => {
    for (const replay of held) {
      replay();
    }
  });

  return () => {
    for (const restore of restores) {
      restore();
    }
  };
});
