export class Diagnostics {
  constructor() {
    this.items = [];
  }

  add(severity, location, code, message) {
    this.items.push({
      severity,
      sheet: location.sheet || 'General',
      cell: location.cell || '-',
      column: location.column || '-',
      code,
      message
    });
  }

  error(location, code, message) {
    this.add('ERROR', location, code, message);
  }

  warn(location, code, message) {
    this.add('WARN', location, code, message);
  }

  get errors() {
    return this.items.filter(function(item) {
      return item.severity === 'ERROR';
    });
  }

  get warnings() {
    return this.items.filter(function(item) {
      return item.severity === 'WARN';
    });
  }

  hasErrors(strict = false) {
    return this.errors.length > 0 ||
      (strict && this.warnings.length > 0);
  }

  formatItem(item) {
    return (
      item.severity +
      ' [' + item.sheet + '!' + item.cell + ' ' + item.column + '] ' +
      item.code + ':\n' +
      item.message
    );
  }

  formatAll() {
    return this.items.map(this.formatItem).join('\n\n');
  }

  summary() {
    return {
      errors: this.errors.length,
      warnings: this.warnings.length
    };
  }
}

export function rowLocation(row, column) {
  return {
    sheet: row._sheet,
    cell: row._cells[column] || ('fila ' + row._row),
    column
  };
}

export function generalLocation(sheet = 'General') {
  return {
    sheet,
    cell: '-',
    column: '-'
  };
}
