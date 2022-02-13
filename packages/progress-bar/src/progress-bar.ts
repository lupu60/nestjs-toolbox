import { Logger } from '@nestjs/common';
import * as colors from 'colors';
export class ProgressBar {
  private total: number;
  private current = 0;
  private logger: Logger;
  private identifier: string;
  private previousProgress = 0;
  public progress: number;

  constructor(options: { identifier: string; total: number }) {
    this.total = options.total;
    this.identifier = options.identifier;
    this.logger = new Logger(`progress_${this.identifier}`);
  }
  tick() {
    this.current++;
    this.progress = this.current === this.total ? 1 : Number((this.current / this.total).toFixed(2));
    if (Math.abs(this.progress - this.previousProgress) > 0.1) {
      this.previousProgress = this.progress;
      const dots = '='.repeat(this.progress * 100);
      const left = Math.abs(1 - this.progress) * 100;
      const empty = ' '.repeat(left);
      const color = this.progress < 0.7 ? colors.yellow : colors.green;
      this.logger.log(color.bold(`\r${this.identifier} [${dots}${empty}] ${this.progress * 100}%`));
    }
  }
}
