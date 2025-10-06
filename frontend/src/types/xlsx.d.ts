declare module 'xlsx' {
  export const utils: any;
  export function read(data: any, opts?: any): any;
  export function writeFile(workbook: any, filename: string): void;
}