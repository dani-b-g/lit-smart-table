import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import type { RowData, TableColumn, TableRequest, SortState } from "./types.js";

/**
 * Native, framework-independent table. The rowKey field must be unique.
 * In remote mode, provide the current page in rows and the global total in totalRows.
 */
@customElement("smart-data-table")
export class SmartDataTable extends LitElement {
  @property({ attribute: false }) rows: RowData[] = [];
  @property({ attribute: false }) columns: TableColumn[] = [];
  @property({ type: String, attribute: "row-key" }) rowKey = "id";
  @property({ type: String }) caption = "Tabla de datos";
  @property({ type: Boolean }) selectable = false;
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) remote = false;
  @property({ type: Number, attribute: "total-rows" }) totalRows = 0;
  @property({ type: Number, attribute: "page-size" }) pageSize = 10;
  @property({ type: Boolean, reflect: true }) compact = false;
  @property({ type: Boolean, attribute: "hide-search" }) hideSearch = false;
  @property({ type: Boolean, attribute: "hide-export" }) hideExport = false;
  @property({ type: String }) locale = "es-ES";

  @state() private search = "";
  @state() private sort: SortState | null = null;
  @state() private filters: Record<string, string> = {};
  @state() private page = 1;
  @state() private selected = new Set<string>();
  @state() private hiddenKeys = new Set<string>();
  @state() private showFilters = false;
  @state() private showColumns = false;

  static styles = css`
    :host {
      display: block;
      color: var(--table-text, #152334);
      font: inherit;
      --border: var(--table-border, #dce3e9);
      --accent: var(--table-accent, #155eef);
      --muted: var(--table-muted, #617184);
      --panel: var(--table-background, #fff);
    }
    * {
      box-sizing: border-box;
    }
    .shell {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
    }
    .toolbar,
    .footer {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      padding: 12px 16px;
    }
    .toolbar {
      border-bottom: 1px solid var(--border);
    }
    .footer {
      border-top: 1px solid var(--border);
      justify-content: space-between;
    }
    .grow {
      flex: 1;
    }
    input,
    select,
    button {
      font: inherit;
      color: inherit;
    }
    input[type="search"],
    input[type="text"],
    select {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 7px;
      padding: 8px 10px;
      min-width: 0;
    }
    input[type="search"] {
      min-width: 190px;
      max-width: 300px;
      width: 100%;
    }
    button {
      cursor: pointer;
      border: 1px solid var(--border);
      border-radius: 7px;
      background: var(--panel);
      padding: 8px 10px;
    }
    button:hover:not(:disabled) {
      border-color: var(--accent);
      color: var(--accent);
    }
    button:focus-visible,
    input:focus-visible,
    select:focus-visible {
      outline: 3px solid var(--accent);
      outline-offset: 2px;
    }
    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .scroll {
      overflow: auto;
      max-height: var(--table-max-height, none);
    }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 14px;
    }
    caption {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    th,
    td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    :host([compact]) th,
    :host([compact]) td {
      padding: 7px 10px;
    }
    th {
      position: sticky;
      top: 0;
      background: var(--table-header, #f5f8fb);
      z-index: 1;
      font-weight: 650;
    }
    th button {
      padding: 0;
      border: 0;
      background: transparent;
      font-weight: inherit;
      display: inline-flex;
      gap: 8px;
      align-items: center;
    }
    tbody tr:hover {
      background: var(--table-hover, #f5f9ff);
    }
    tbody tr[aria-selected="true"] {
      background: var(--table-selected, #e8f0ff);
    }
    tr:last-child td {
      border-bottom: 0;
    }
    .muted {
      color: var(--muted);
      font-size: 13px;
    }
    .empty {
      padding: 35px 16px;
      text-align: center;
      color: var(--muted);
    }
    .filters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
    }
    .filter {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 150px;
    }
    .filter label {
      font-size: 12px;
      color: var(--muted);
    }
    .column-menu {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--border);
    }
    .column-menu label {
      display: inline-flex;
      gap: 5px;
      align-items: center;
    }
    .check {
      width: 16px;
      height: 16px;
      accent-color: var(--accent);
      cursor: pointer;
    }
    .count {
      font-variant-numeric: tabular-nums;
    }
    ::slotted(*) {
      vertical-align: middle;
    }
    @media (max-width: 600px) {
      .toolbar {
        gap: 6px;
      }
      .toolbar input[type="search"] {
        flex: 1;
        min-width: 120px;
      }
      .footer {
        font-size: 13px;
      }
    }
  `;

  private fire(name: string, detail: unknown) {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true }),
    );
  }
  private get visibleColumns() {
    return this.columns.filter((c) => !c.hidden && !this.hiddenKeys.has(c.key));
  }
  private get valueFor() {
    return (row: RowData, col: TableColumn) =>
      col.value ? col.value(row) : row[col.key];
  }
  private stringValue(v: unknown): string {
    return v == null ? "" : String(v);
  }
  private keyFor(row: RowData): string {
    return String(row[this.rowKey]);
  }
  private normalized(v: unknown): string {
    return this.stringValue(v).toLocaleLowerCase(this.locale);
  }

  private get computedRows(): RowData[] {
    if (this.remote) return this.rows;
    let result = this.rows.filter((row) => {
      const matchesSearch =
        !this.search ||
        this.columns.some((c) =>
          this.normalized(this.valueFor(row, c)).includes(
            this.normalized(this.search),
          ),
        );
      const matchesFilters = Object.entries(this.filters).every(
        ([key, term]) => {
          if (!term) return true;
          const col = this.columns.find((c) => c.key === key);
          return col
            ? this.normalized(this.valueFor(row, col)).includes(
                this.normalized(term),
              )
            : true;
        },
      );
      return matchesSearch && matchesFilters;
    });
    if (this.sort) {
      const column = this.columns.find((c) => c.key === this.sort?.key);
      if (column) {
        const direction = this.sort.direction === "asc" ? 1 : -1;
        result = [...result].sort((a, b) => {
          const aa = this.valueFor(a, column),
            bb = this.valueFor(b, column);
          if (aa == null && bb == null) return 0;
          if (aa == null) return 1;
          if (bb == null) return -1;
          if (column.type === "number")
            return ((Number(aa) || 0) - (Number(bb) || 0)) * direction;
          if (column.type === "date") {
            const x = new Date(String(aa)).getTime(),
              y = new Date(String(bb)).getTime();
            return (
              ((Number.isNaN(x) ? 0 : x) - (Number.isNaN(y) ? 0 : y)) *
              direction
            );
          }
          return (
            this.stringValue(aa).localeCompare(
              this.stringValue(bb),
              this.locale,
              { numeric: true, sensitivity: "base" },
            ) * direction
          );
        });
      }
    }
    return result;
  }
  private get count() {
    return this.remote ? Math.max(0, this.totalRows) : this.computedRows.length;
  }
  private get maxPage() {
    return Math.max(1, Math.ceil(this.count / Math.max(1, this.pageSize)));
  }
  private get currentPage() {
    return Math.min(this.page, this.maxPage);
  }
  private get pageRows() {
    return this.remote
      ? this.rows
      : this.computedRows.slice(
          (this.currentPage - 1) * this.pageSize,
          this.currentPage * this.pageSize,
        );
  }
  private get request(): TableRequest {
    return {
      page: this.currentPage,
      pageSize: this.pageSize,
      search: this.search,
      sort: this.sort,
      filters: { ...this.filters },
    };
  }
  private emitRequest() {
    this.fire("table-request", this.request);
  }
  private setPage(page: number) {
    this.page = Math.max(1, Math.min(this.maxPage, page));
    this.fire("page-change", this.request);
    this.emitRequest();
  }
  private setSort(key: string) {
    this.sort =
      this.sort?.key === key
        ? this.sort.direction === "asc"
          ? { key, direction: "desc" }
          : null
        : { key, direction: "asc" };
    this.page = 1;
    this.fire("sort-change", this.sort);
    this.emitRequest();
  }
  private setSearch(value: string) {
    this.search = value;
    this.page = 1;
    this.fire("search-change", { search: value });
    this.emitRequest();
  }
  private setFilter(key: string, value: string) {
    this.filters = { ...this.filters, [key]: value };
    this.page = 1;
    this.fire("filter-change", { filters: { ...this.filters } });
    this.emitRequest();
  }
  private updateSelection(keys: Iterable<string>) {
    this.selected = new Set(keys);
    this.fire("selection-change", {
      keys: [...this.selected],
      rows: this.rows.filter((r) => this.selected.has(this.keyFor(r))),
    });
  }
  private toggleOne(row: RowData, checked: boolean) {
    const copy = new Set(this.selected),
      key = this.keyFor(row);
    if (checked) copy.add(key);
    else copy.delete(key);
    this.updateSelection(copy);
  }
  private togglePage(checked: boolean) {
    const copy = new Set(this.selected);
    for (const row of this.pageRows) {
      const key = this.keyFor(row);
      if (checked) copy.add(key);
      else copy.delete(key);
    }
    this.updateSelection(copy);
  }
  private get allPageSelected() {
    return (
      this.pageRows.length > 0 &&
      this.pageRows.every((r) => this.selected.has(this.keyFor(r)))
    );
  }
  private get somePageSelected() {
    return this.pageRows.some((r) => this.selected.has(this.keyFor(r)));
  }
  private display(value: unknown, col: TableColumn, row: RowData): string {
    if (col.format) return col.format(value, row);
    if (value == null) return "—";
    if (col.type === "boolean") return value ? "Sí" : "No";
    if (col.type === "number" && typeof value === "number")
      return new Intl.NumberFormat(this.locale).format(value);
    if (col.type === "date") {
      const date = new Date(String(value));
      return isNaN(date.getTime())
        ? String(value)
        : new Intl.DateTimeFormat(this.locale).format(date);
    }
    return String(value);
  }
  /** Export the currently filtered + sorted client-side set or the current loaded remote page. */
  exportCSV() {
    const cols = this.visibleColumns;
    const escapeCSV = (v: unknown) =>
      '"' +
      String(v ?? "")
        .replace(/^[=+\-@\t\r]/, "'\$&")
        .replaceAll('"', '""') +
      '"';
    const data = this.remote ? this.rows : this.computedRows;
    const lines = [
      cols.map((c) => escapeCSV(c.label)).join(","),
      ...data.map((r) =>
        cols
          .map((c) => escapeCSV(this.display(this.valueFor(r, c), c, r)))
          .join(","),
      ),
    ];
    const blob = new Blob(["\ufeff", lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "table-export.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.fire("export", {
      count: data.length,
      scope: this.remote ? "loaded-page" : "filtered",
    });
  }
  /** Clear selection; useful when the host replaces the dataset. */
  clearSelection() {
    this.updateSelection([]);
  }
  /** Return selected keys (across pages). */
  getSelectedKeys(): string[] {
    return [...this.selected];
  }
  /** Reset table search, filters, sort and pagination. */
  resetView() {
    this.search = "";
    this.filters = {};
    this.sort = null;
    this.page = 1;
    this.emitRequest();
  }

  protected render(): TemplateResult {
    const pageRows = this.pageRows,
      count = this.count,
      first = count === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    const last = Math.min(count, first + pageRows.length - 1);
    const pageCount = this.maxPage;
    return html`<div class="shell" part="container">
      <div class="toolbar" part="toolbar">
        <slot name="toolbar-start"></slot>
        ${this.hideSearch
          ? nothing
          : html`<input
              type="search"
              aria-label="Buscar en la tabla"
              placeholder="Buscar..."
              .value=${this.search}
              @input=${(e: Event) =>
                this.setSearch((e.target as HTMLInputElement).value)}
            />`}
        <div class="grow"></div>
        <button
          type="button"
          aria-expanded=${this.showFilters}
          @click=${() => (this.showFilters = !this.showFilters)}
        >
          Filtros
        </button>
        <button
          type="button"
          aria-expanded=${this.showColumns}
          @click=${() => (this.showColumns = !this.showColumns)}
        >
          Columnas
        </button>
        <button type="button" @click=${() => (this.compact = !this.compact)}>
          ${this.compact ? "Normal" : "Compacta"}
        </button>
        ${this.hideExport
          ? nothing
          : html`<button type="button" @click=${this.exportCSV}>CSV</button>`}
        <slot name="toolbar-end"></slot>
      </div>
      ${this.showFilters
        ? html`<div class="filters" part="filters">
            ${this.columns
              .filter((c) => c.filterable !== false)
              .map(
                (c) =>
                  html`<div class="filter">
                    <label for=${`filter-${c.key}`}>${c.label}</label
                    ><input
                      id=${`filter-${c.key}`}
                      type="text"
                      .value=${this.filters[c.key] ?? ""}
                      @input=${(e: Event) =>
                        this.setFilter(
                          c.key,
                          (e.target as HTMLInputElement).value,
                        )}
                    />
                  </div>`,
              )}
            <button @click=${() => this.resetView()}>Restablecer</button>
          </div>`
        : nothing}
      ${this.showColumns
        ? html`<div class="column-menu" part="column-picker">
            ${this.columns
              .filter((c) => !c.hidden)
              .map(
                (c) =>
                  html`<label
                    ><input
                      type="checkbox"
                      class="check"
                      .checked=${!this.hiddenKeys.has(c.key)}
                      @change=${(e: Event) => {
                        const s = new Set(this.hiddenKeys);
                        (e.target as HTMLInputElement).checked
                          ? s.delete(c.key)
                          : s.add(c.key);
                        this.hiddenKeys = s;
                      }}
                    />${c.label}</label
                  >`,
              )}
          </div>`
        : nothing}
      <div class="scroll" part="scroll-area">
        <table part="table">
          <caption>
            ${this.caption}
          </caption>
          <thead>
            <tr>
              ${this.selectable
                ? html`<th scope="col">
                    <input
                      type="checkbox"
                      class="check"
                      aria-label="Seleccionar filas de la página"
                      .checked=${this.allPageSelected}
                      .indeterminate=${!this.allPageSelected &&
                      this.somePageSelected}
                      @change=${(e: Event) =>
                        this.togglePage((e.target as HTMLInputElement).checked)}
                    />
                  </th>`
                : nothing}
              ${this.visibleColumns.map(
                (c) =>
                  html`<th
                    scope="col"
                    style=${`width:${c.width ?? "auto"};text-align:${c.align ?? "left"}`}
                    aria-sort=${this.sort?.key === c.key
                      ? this.sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"}
                  >
                    ${c.sortable === false
                      ? c.label
                      : html`<button
                          type="button"
                          @click=${() => this.setSort(c.key)}
                          aria-label=${`Ordenar por ${c.label}`}
                        >
                          ${c.label}
                          <span aria-hidden="true"
                            >${this.sort?.key === c.key
                              ? this.sort.direction === "asc"
                                ? "▲"
                                : "▼"
                              : "↕"}</span
                          >
                        </button>`}
                  </th>`,
              )}
            </tr>
          </thead>
          <tbody>
            ${this.loading
              ? html`<tr>
                  <td
                    class="empty"
                    colspan=${this.visibleColumns.length +
                    (this.selectable ? 1 : 0)}
                    role="status"
                  >
                    Cargando datos…
                  </td>
                </tr>`
              : pageRows.length === 0
                ? html`<tr>
                    <td
                      class="empty"
                      colspan=${this.visibleColumns.length +
                      (this.selectable ? 1 : 0)}
                    >
                      No hay resultados
                    </td>
                  </tr>`
                : repeat(
                    pageRows,
                    (r) => this.keyFor(r),
                    (r) =>
                      html`<tr
                        aria-selected=${this.selectable
                          ? String(this.selected.has(this.keyFor(r)))
                          : nothing}
                        @dblclick=${() =>
                          this.fire("row-activate", {
                            row: r,
                            key: this.keyFor(r),
                          })}
                      >
                        ${this.selectable
                          ? html`<td>
                              <input
                                class="check"
                                type="checkbox"
                                aria-label=${`Seleccionar fila ${this.keyFor(r)}`}
                                .checked=${this.selected.has(this.keyFor(r))}
                                @change=${(e: Event) =>
                                  this.toggleOne(
                                    r,
                                    (e.target as HTMLInputElement).checked,
                                  )}
                              />
                            </td>`
                          : nothing}
                        ${this.visibleColumns.map(
                          (c) =>
                            html`<td
                              style=${`text-align:${c.align ?? "left"}`}
                              title=${this.display(this.valueFor(r, c), c, r)}
                            >
                              ${this.display(this.valueFor(r, c), c, r)}
                            </td>`,
                        )}
                      </tr>`,
                  )}
          </tbody>
        </table>
      </div>
      <div class="footer" part="footer">
        <span class="muted count" aria-live="polite"
          >${first}–${Math.max(first, last)} de ${count}
          ${this.selectable
            ? html` · ${this.selected.size} seleccionadas`
            : nothing}</span
        >
        <span class="grow"></span>
        <label class="muted"
          >Filas por página
          <select
            aria-label="Filas por página"
            .value=${String(this.pageSize)}
            @change=${(e: Event) => {
              this.pageSize = Number((e.target as HTMLSelectElement).value);
              this.setPage(1);
            }}
          >
            ${[5, 10, 20, 50, 100].map(
              (size) => html`<option value=${size}>${size}</option>`,
            )}
          </select></label
        >
        <button
          aria-label="Primera página"
          ?disabled=${this.currentPage <= 1}
          @click=${() => this.setPage(1)}
        >
          «
        </button>
        <button
          aria-label="Página anterior"
          ?disabled=${this.currentPage <= 1}
          @click=${() => this.setPage(this.currentPage - 1)}
        >
          ‹
        </button>
        <span class="muted count">${this.currentPage} / ${pageCount}</span>
        <button
          aria-label="Página siguiente"
          ?disabled=${this.currentPage >= pageCount}
          @click=${() => this.setPage(this.currentPage + 1)}
        >
          ›
        </button>
        <button
          aria-label="Última página"
          ?disabled=${this.currentPage >= pageCount}
          @click=${() => this.setPage(pageCount)}
        >
          »
        </button>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "smart-data-table": SmartDataTable;
  }
}
