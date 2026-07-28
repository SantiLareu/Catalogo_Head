const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF111111' }
};

const HEADER_FONT = {
  bold: true,
  color: { argb: 'FFFFFFFF' }
};

const BODY_BORDER = {
  bottom: {
    style: 'hair',
    color: { argb: 'FFD9D9D9' }
  }
};

export function styleWorksheet(worksheet, widths) {
  worksheet.views = [
    {
      state: 'frozen',
      ySplit: 1,
      showGridLines: false
    }
  ];
  worksheet.autoFilter = {
    from: {
      row: 1,
      column: 1
    },
    to: {
      row: 1,
      column: widths.length
    }
  };

  const header = worksheet.getRow(1);
  header.height = 24;
  header.fill = HEADER_FILL;
  header.font = HEADER_FONT;
  header.alignment = {
    vertical: 'middle',
    horizontal: 'left'
  };

  widths.forEach(function(width, index) {
    worksheet.getColumn(index + 1).width = width;
  });

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    row.height = 19;
    row.alignment = {
      vertical: 'middle',
      horizontal: 'left'
    };

    row.eachCell(function(cell) {
      cell.border = BODY_BORDER;
    });

    if (rowNumber % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF7F7F7' }
      };
    }
  }
}

export function setListValidation(
  worksheet,
  columnNumber,
  firstRow,
  lastRow,
  formula
) {
  for (let row = firstRow; row <= lastRow; row += 1) {
    worksheet.getCell(row, columnNumber).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [formula],
      showErrorMessage: true,
      errorStyle: 'stop',
      errorTitle: 'Valor no permitido',
      error: 'Seleccione un valor de la lista.'
    };
  }
}
