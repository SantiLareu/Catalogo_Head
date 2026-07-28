import ExcelJS from 'exceljs';
import { generalLocation } from './diagnostics.mjs';

export const SHEET_SCHEMAS = {
  Categorias: [
    'categoria_id',
    'parent_id',
    'label',
    'target',
    'habilitada',
    'product_category',
    'product_subcategory',
    'genero',
    'title',
    'subtitle',
    'data_source',
    'orden'
  ],
  Productos: [
    'producto_id',
    'nombre',
    'categoria',
    'subcategoria',
    'genero',
    'sku',
    'precio',
    'habilitado',
    'stock_mode',
    'orden'
  ],
  Variantes: [
    'producto_id',
    'variante_id',
    'sku',
    'color_nombre',
    'color_hex',
    'precio',
    'thumbnail',
    'orden'
  ],
  Imagenes: [
    'producto_id',
    'variante_id',
    'ruta',
    'orden'
  ],
  Stock: [
    'producto_id',
    'variante_id',
    'talle',
    'stock',
    'orden'
  ],
  Caracteristicas: [
    'producto_id',
    'clave',
    'etiqueta',
    'valor',
    'orden'
  ],
  Listas: [
    'generos',
    'stock_modes',
    'talles',
    'extensiones',
    'categorias',
    'subcategorias',
    'booleanos'
  ]
};

function isFormula(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    Object.prototype.hasOwnProperty.call(value, 'formula')
  );
}

function isBlank(value) {
  return value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '');
}

function literalValue(cell, diagnostics, sheetName, header) {
  if (isFormula(cell.value) || cell.type === ExcelJS.ValueType.Formula) {
    diagnostics.error(
      {
        sheet: sheetName,
        cell: cell.address,
        column: header
      },
      'FORMULA_NOT_ALLOWED',
      'Las fórmulas de Excel no están permitidas. Use un valor literal.'
    );
    return null;
  }

  return cell.value;
}

function headersMatch(actual, expected) {
  return actual.length === expected.length &&
    actual.every(function(header, index) {
      return header === expected[index];
    });
}

function readSheet(worksheet, expectedHeaders, diagnostics) {
  const headerRow = worksheet.getRow(1);
  const actualHeaders = expectedHeaders.map(function(_, index) {
    return literalValue(
      headerRow.getCell(index + 1),
      diagnostics,
      worksheet.name,
      'encabezado'
    );
  });

  const extraHeaders = [];

  for (
    let column = expectedHeaders.length + 1;
    column <= headerRow.cellCount;
    column += 1
  ) {
    const value = headerRow.getCell(column).value;

    if (!isBlank(value)) {
      extraHeaders.push(String(value));
    }
  }

  if (
    !headersMatch(actualHeaders, expectedHeaders) ||
    extraHeaders.length
  ) {
    diagnostics.error(
      generalLocation(worksheet.name),
      'INVALID_HEADERS',
      'Encabezados esperados: ' +
        expectedHeaders.join(', ') +
        '. Encabezados encontrados: ' +
        actualHeaders.concat(extraHeaders).join(', ') +
        '.'
    );
    return [];
  }

  const populatedRows = [];
  let lastNonBlankRow = 1;

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const excelRow = worksheet.getRow(rowNumber);
    const values = expectedHeaders.map(function(header, index) {
      return excelRow.getCell(index + 1).value;
    });

    if (values.some(function(value) { return !isBlank(value); })) {
      lastNonBlankRow = rowNumber;
    }
  }

  for (let rowNumber = 2; rowNumber <= lastNonBlankRow; rowNumber += 1) {
    const excelRow = worksheet.getRow(rowNumber);
    const record = {
      _sheet: worksheet.name,
      _row: rowNumber,
      _cells: {}
    };
    let hasValue = false;

    expectedHeaders.forEach(function(header, index) {
      const cell = excelRow.getCell(index + 1);
      const value = literalValue(
        cell,
        diagnostics,
        worksheet.name,
        header
      );

      record[header] = value;
      record._cells[header] = cell.address;

      if (!isBlank(value)) {
        hasValue = true;
      }
    });

    if (!hasValue) {
      diagnostics.warn(
        {
          sheet: worksheet.name,
          cell: 'fila ' + rowNumber,
          column: '-'
        },
        'EMPTY_INTERMEDIATE_ROW',
        'La fila está vacía entre otras filas con datos.'
      );
      continue;
    }

    populatedRows.push(record);
  }

  return populatedRows;
}

export async function readWorkbook(inputPath, diagnostics) {
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.readFile(inputPath);
  } catch (error) {
    diagnostics.error(
      generalLocation('Workbook'),
      'WORKBOOK_READ_FAILED',
      'No se pudo abrir el Excel: ' + error.message
    );

    return {
      workbook: null,
      sheets: {}
    };
  }

  const sheets = {};

  Object.entries(SHEET_SCHEMAS).forEach(function(entry) {
    const sheetName = entry[0];
    const headers = entry[1];
    const worksheet = workbook.getWorksheet(sheetName);

    if (!worksheet) {
      diagnostics.error(
        generalLocation(sheetName),
        'MISSING_SHEET',
        'Falta la hoja obligatoria "' + sheetName + '".'
      );
      sheets[sheetName] = [];
      return;
    }

    sheets[sheetName] = readSheet(
      worksheet,
      headers,
      diagnostics
    );
  });

  return {
    workbook,
    sheets
  };
}
