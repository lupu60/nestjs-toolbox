import { ProgressBar } from '../progress-bar';

describe('ProgressBar', () => {
  it('should ', () => {
    const progressBar = new ProgressBar({ identifier: 'test', total: 10 });
    for (let i = 0; i < 10; i++) {
      progressBar.tick();
    }
  });
});
