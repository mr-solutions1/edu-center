import ExcelJS from 'exceljs';

class ExcelService {
  /**
   * Generates a beautifully styled, Arabic RTL formatted Excel sheet.
   *
   * @param {Object} res - Express response stream
   * @param {string} fileName - File download name (e.g. 'teacher-report')
   * @param {string} sheetName - Worksheet title
   * @param {Array<string>} headers - Headers row array
   * @param {Array<Array<any>>} rows - Values matrix
   * @param {Array<number>} [columnWidths] - Optional column widths
   */
  async exportToExcel(res, fileName, sheetName, headers, rows, columnWidths = []) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ rtlMode: true }], // Enable Right-to-Left for Arabic layouts!
    });

    // 1. Add Title Block
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `أكاديمية ركان - ${sheetName}`;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF002855' }, // Branded Deep Blue
    };
    worksheet.getRow(1).height = 40;

    // 2. Add Generation Date Row
    worksheet.mergeCells('A2:E2');
    const dateCell = worksheet.getCell('A2');
    const dateStr = new Date().toLocaleString('ar-KW', { timeZone: 'Asia/Kuwait' });
    dateCell.value = `تاريخ الإنشاء: ${dateStr}`;
    dateCell.font = { name: 'Arial', size: 10, italic: true };
    dateCell.alignment = { horizontal: 'right' };
    worksheet.getRow(2).height = 20;

    worksheet.addRow([]); // Blank spacer

    // 3. Add Headers Row
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF002855' }, // Deep Blue
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // 4. Add Rows
    rows.forEach((rowData, index) => {
      const row = worksheet.addRow(rowData);
      row.height = 20;

      const isOdd = index % 2 === 1;
      row.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        if (isOdd) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9F9F9' }, // Zebra shading
          };
        }
      });
    });

    // 5. Apply Column Widths
    if (columnWidths.length > 0) {
      columnWidths.forEach((width, index) => {
        const col = worksheet.getColumn(index + 1);
        col.width = width;
      });
    } else {
      worksheet.columns.forEach((column) => {
        let maxLen = 10;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const val = cell.value ? cell.value.toString() : '';
          if (val.length > maxLen) maxLen = val.length;
        });
        column.width = maxLen + 2;
      });
    }

    // 6. Pipe back to Express Response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    // Use RFC 5987 to safely encode Arabic filenames in HTTP headers!
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  }
}

export const excelService = new ExcelService();
