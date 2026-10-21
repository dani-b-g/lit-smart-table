# Smart Data Table (Lit 3)

Web Component **nativo y agnóstico de framework** con TypeScript y Lit. Incluye vista demo mediante Vite y compilación como librería ESM.

## Arranque

```bash
npm install
npm run dev
npm run check
npm run build
```

Abre la URL indicada por Vite (normalmente `http://localhost:5173`).

## Uso

```ts
import 'lit-smart-data-table';
import type { SmartDataTable } from 'lit-smart-data-table';

const table = document.querySelector<SmartDataTable>('smart-data-table')!;
table.rowKey = 'id';
table.columns = [
  {key:'id',label:'Identificador',type:'number'},
  {key:'name',label:'Nombre',sortable:true,filterable:true},
  {key:'amount',label:'Importe',type:'number',align:'right'}
];
table.rows = [{id:1,name:'Ana',amount:123.5}];
```

```html
<smart-data-table selectable page-size="20" caption="Mi tabla"></smart-data-table>
```

Las propiedades complejas `rows` y `columns` se asignan por JavaScript, **no mediante atributos JSON**. Actualiza sus referencias para que Lit renderice los cambios.

## Propiedades

| Propiedad | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `rows` | `RowData[]` | `[]` | Datos en memoria o página remota cargada |
| `columns` | `TableColumn[]` | `[]` | Definición de columnas |
| `rowKey` | `string` | `'id'` | Campo identificador único de cada fila |
| `caption` | `string` | `'Tabla de datos'` | Nombre accesible de la tabla |
| `selectable` | `boolean` | `false` | Casillas de selección individual y página |
| `pageSize` | `number` | `10` | Filas por página |
| `loading` | `boolean` | `false` | Indicador de carga |
| `remote` | `boolean` | `false` | Desactiva filtrado, orden y paginación locales |
| `totalRows` | `number` | `0` | Total global para el modo remoto |
| `compact` | `boolean` | `false` | Densidad compacta |
| `hideSearch` / `hideExport` | `boolean` | `false` | Ocultar controles |
| `locale` | `string` | `'es-ES'` | Locale para valores y ordenación |

`TableColumn`: `key`, `label`, `type`, `sortable`, `filterable`, `hidden`, `width`, `align`, `format`, `value`.

## Eventos

Los eventos burbujean y cruzan el Shadow DOM mediante `composed:true`.

- `table-request`: `{page,pageSize,search,sort,filters}`; disparado cuando cambian las condiciones de consulta.
- `page-change`: mismo payload.
- `sort-change`: `{key,direction}` o `null`.
- `search-change`: `{search}`.
- `filter-change`: `{filters}`.
- `selection-change`: `{keys,rows}` (`rows` contiene únicamente filas presentes en la página/dataset cargado).
- `row-activate`: `{row,key}` al hacer doble clic.
- `export`: `{count,scope}`.

Métodos: `exportCSV()`, `clearSelection()`, `getSelectedKeys()`, `resetView()`.

## Paginación desde API (server-side)

```ts
const table = document.querySelector<SmartDataTable>('smart-data-table')!;
table.remote = true;
table.pageSize = 20;
table.addEventListener('table-request', async (e) => {
  const req = (e as CustomEvent<TableRequest>).detail;
  table.loading = true;
  try {
    const response = await fetch('/api/employees?' + new URLSearchParams({
      page: String(req.page), size:String(req.pageSize), search:req.search,
      sort:req.sort?.key ?? '', direction:req.sort?.direction ?? ''
    }));
    if (!response.ok) throw new Error('HTTP '+response.status);
    const result = await response.json() as {items:RowData[],total:number};
    table.rows = result.items;
    table.totalRows = result.total;
  } finally { table.loading = false; }
});
```

El host debe pedir una página inicial, gestionar errores, cancelar peticiones obsoletas y convertir filtros al contrato de la API. `CSV` en modo remoto exporta **solo la página cargada**. Para exportación completa, implementar endpoint backend específico.

## Personalización

- Variables CSS: `--table-text`, `--table-border`, `--table-accent`, `--table-muted`, `--table-background`, `--table-header`, `--table-hover`, `--table-selected`, `--table-max-height`.
- `::part(container)`, `::part(toolbar)`, `::part(table)`, `::part(footer)`, etc.
- Slots `toolbar-start`, `toolbar-end`.

## Limitaciones y evolución

Incluye funcionalidades esenciales de grid empresarial, pero no pretende equipararse ya con AG Grid: no tiene virtualización, edición de celdas, columnas redimensionables, agrupación, drag & drop, navegación de cuadrícula estilo ARIA grid, filtros avanzados de rangos, ni exportación XLSX. Los contenidos de celdas se tratan como **texto** para evitar inyección HTML. La tabla usa semántica HTML nativa (table), navegación habitual de controles y encabezados accesibles.

La búsqueda local examina todas las columnas, incluidas ocultas. La selección se conserva por clave al cambiar de página. Para grandes volúmenes, activar `remote`.
