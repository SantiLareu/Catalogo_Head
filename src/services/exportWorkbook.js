// Escritura del workbook .xlsx en el navegador.
//
// Capa delgada sobre SheetJS (`xlsx`): recibe la tabla ya normalizada desde
// `catalogExport.js` y genera la descarga. La librería se importa de forma
// diferida para no agrandar el bundle inicial: solo se descarga cuando el
// cliente confirma "Descargar Excel".
//
// La edición Community de SheetJS no aplica estilos de celda al escribir;
// el archivo sale deliberadamente plano: una hoja "Productos" con la fila de
// encabezados seguida de los datos. Los anchos de columna (`!cols`) son solo
// presentación local y no agregan columnas ni filas.

const SHEET_COLUMN_WIDTHS = [
  { wch: 34 }, // Artículo
  { wch: 20 }, // Color
  { wch: 10 }, // Talle
  { wch: 22 }, // Categoría
  { wch: 22 }, // Subcategoría
  { wch: 12 } // Precio
];

async function loadXlsx() {
  const imported = await import('xlsx');
  if (imported?.utils?.aoa_to_sheet) return imported;
  if (imported?.default?.utils?.aoa_to_sheet) return imported.default;
  throw new Error('La librería de Excel no se cargó correctamente.');
}

export async function downloadCatalogExport({ headers, rows, sheetName, fileName }) {
  const XLSX = await loadXlsx();
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  worksheet['!cols'] = SHEET_COLUMN_WIDTHS;
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}
