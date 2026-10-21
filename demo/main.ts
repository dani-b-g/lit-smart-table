import '../src/index.js';
import type { SmartDataTable, TableColumn } from '../src/index.js';
const table = document.querySelector<SmartDataTable>('#table')!;
const columns: TableColumn[] = [
  {key:'id',label:'ID',type:'number',width:'80px',align:'right'},
  {key:'name',label:'Nombre'},
  {key:'email',label:'Correo electrónico'},
  {key:'team',label:'Equipo'},
  {key:'salary',label:'Salario',type:'number',align:'right',format:v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v))},
  {key:'active',label:'Activo',type:'boolean',align:'center'},
  {key:'joined',label:'Incorporación',type:'date'}
];
const names=['Ana García','Luis Martín','Laura Pérez','David Romero','Sofía Ruiz','Carlos Sánchez','Elena Díaz','Marta Molina','Pablo Torres','Lucía Ortega'];
const teams=['Frontend','Backend','Diseño','Datos','QA'];
table.columns=columns;
table.rows=Array.from({length:137},(_,i)=>({id:i+1,name:names[i%names.length],email:`usuario${i+1}@empresa.es`,team:teams[i%teams.length],salary:28000+(i%15)*1750,active:i%4!==0,joined:`202${i%6}-0${(i%9)+1}-15`}));
table.addEventListener('selection-change',(event)=>{
  const keys=(event as CustomEvent<{keys:string[]}>).detail.keys;
  document.querySelector('#events')!.textContent=`Filas seleccionadas: ${keys.length}`;
});
table.addEventListener('row-activate',(event)=>{
  const {key}=(event as CustomEvent<{key:string}>).detail;
  document.querySelector('#events')!.textContent=`Doble clic en fila ${key}`;
});
