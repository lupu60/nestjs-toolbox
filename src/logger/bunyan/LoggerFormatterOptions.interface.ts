export interface LoggerFormatterOptions {
  outputMode: string; // short|long|simple|json|bunyan
  color?: boolean;
  levelInString?: boolean;
  colorFromLevel?: any;
}
