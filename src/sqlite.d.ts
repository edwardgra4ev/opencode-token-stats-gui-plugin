declare module "bun:sqlite" {
  export class Database {
    constructor(filename: string, options?: { readonly?: boolean; create?: boolean })
    query(sql: string): { all(...params: unknown[]): unknown[] }
    prepare(sql: string): { all(...params: unknown[]): unknown[] }
    close(): void
  }
}
