export type RowData = Record<string, unknown>;
export type ColumnType = 'text' | 'number' | 'date' | 'boolean';
export type Align = 'left' | 'center' | 'right';
export type SortDirection = 'asc' | 'desc';
export interface TableColumn<T extends RowData = RowData> {
  key: keyof T & string;
  label: string;
  type?: ColumnType;
  sortable?: boolean;
  filterable?: boolean;
  hidden?: boolean;
  width?: string;
  align?: Align;
  /** Called for display only. Return text, not HTML. */
  format?: (value: unknown, row: T) => string;
  /** Return the raw value for search, filtering and sorting. */
  value?: (row: T) => unknown;
}
export interface SortState { key: string; direction: SortDirection }
export interface TableRequest {
  page: number;
  pageSize: number;
  search: string;
  sort: SortState | null;
  filters: Record<string, string>;
}
