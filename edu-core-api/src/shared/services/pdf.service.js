import path from 'path';
import { fileURLToPath } from 'url';

import ArabicReshaper from 'arabic-persian-reshaper';
import bidiFactory from 'bidi-js';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bidi = bidiFactory();

class PDFService {
  constructor() {
    this.fonts = {
      regular: path.join(
        __dirname,
        '../../../assets/fonts/Tajawal-Regular.ttf'
      ),
      bold: path.join(__dirname, '../../../assets/fonts/Tajawal-Bold.ttf'),
    };
    this.colors = {
      primary: '#002855', // Deep Blue
      accent: '#FFB800', // Gold
      text: '#333333',
      lightText: '#666666',
      border: '#EEEEEE',
    };
  }

  /**
   * Reshape and reorder Arabic text for PDF rendering
   */
  processArabicText(text) {
    if (!text) {
      return '';
    }
    // 1. Reshape Arabic characters (contextual forms)
    const reshaped = ArabicReshaper.ArabicShaper.convertArabic(text);
    // 2. Apply Bidi algorithm for RTL reordering
    const levels = bidi.getEmbeddingLevels(reshaped);
    const bidiResult = bidi.getReorderedString(reshaped, levels);
    return bidiResult;
  }

  /**
   * Initialize a new PDF document with standard branding
   */
  initDocument(res, _title) {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true,
    });

    doc.pipe(res);

    // Register Fonts
    doc.registerFont('Tajawal', this.fonts.regular);
    doc.registerFont('Tajawal-Bold', this.fonts.bold);

    return doc;
  }

  /**
   * Add Header with Branding
   */
  addHeader(doc, title) {
    // Top Bar
    doc.rect(0, 0, doc.page.width, 40).fill(this.colors.primary);

    // Academy Name (Arabic)
    doc
      .fillColor('#FFFFFF')
      .font('Tajawal-Bold')
      .fontSize(16)
      .text(this.processArabicText('أكاديمية ركان'), 50, 12, {
        align: 'right',
      });

    // Report Title
    doc
      .fillColor(this.colors.text)
      .font('Tajawal-Bold')
      .fontSize(20)
      .text(this.processArabicText(title), 50, 70, { align: 'center' });

    // Generation Date
    const dateStr = new Date().toLocaleString('ar-KW', {
      timeZone: 'Asia/Kuwait',
    });
    doc
      .fontSize(10)
      .font('Tajawal')
      .fillColor(this.colors.lightText)
      .text(`${this.processArabicText('تاريخ الإنشاء:')} ${dateStr}`, 50, 100, {
        align: 'left',
      });

    // Divider
    doc
      .moveTo(50, 120)
      .lineTo(doc.page.width - 50, 120)
      .strokeColor(this.colors.border)
      .stroke();

    doc.moveDown(2);
  }

  /**
   * Add Footer with Pagination
   */
  addFooters(doc) {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);

      const bottom = doc.page.height - 50;

      doc
        .moveTo(50, bottom - 10)
        .lineTo(doc.page.width - 50, bottom - 10)
        .strokeColor(this.colors.border)
        .stroke();

      doc
        .fontSize(10)
        .fillColor(this.colors.lightText)
        .text(
          this.processArabicText(`صفحة ${i + 1} من ${range.count}`),
          50,
          bottom,
          { align: 'center' }
        );

      doc.text(
        this.processArabicText('أكاديمية ركان - نظام الإدارة المتكامل'),
        50,
        bottom,
        { align: 'right' }
      );
    }
  }

  /**
   * Helper to draw a table
   */
  drawTable(doc, startY, headers, rows, colWidths) {
    let currentY = startY;
    const margin = 50;

    // Table Header
    doc
      .rect(margin, currentY, doc.page.width - 100, 25)
      .fill(this.colors.primary);
    doc.fillColor('#FFFFFF').font('Tajawal-Bold').fontSize(11);

    let currentX = doc.page.width - margin;
    headers.forEach((header, i) => {
      currentX -= colWidths[i];
      doc.text(this.processArabicText(header), currentX, currentY + 7, {
        width: colWidths[i],
        align: 'center',
      });
    });

    currentY += 25;
    doc.fillColor(this.colors.text).font('Tajawal').fontSize(10);

    // Rows
    rows.forEach((row, rowIndex) => {
      // Check for page break
      if (currentY > doc.page.height - 100) {
        doc.addPage();
        this.addHeader(doc, 'تابع التقرير');
        currentY = 150;

        // Re-draw headers on new page
        doc
          .rect(margin, currentY, doc.page.width - 100, 25)
          .fill(this.colors.primary);
        doc.fillColor('#FFFFFF').font('Tajawal-Bold');
        let hX = doc.page.width - margin;
        headers.forEach((header, i) => {
          hX -= colWidths[i];
          doc.text(this.processArabicText(header), hX, currentY + 7, {
            width: colWidths[i],
            align: 'center',
          });
        });
        currentY += 25;
        doc.fillColor(this.colors.text).font('Tajawal');
      }

      // Zebra striping
      if (rowIndex % 2 === 1) {
        doc.rect(margin, currentY, doc.page.width - 100, 20).fill('#F9F9F9');
      }

      doc.fillColor(this.colors.text);
      let rowX = doc.page.width - margin;
      row.forEach((cell, i) => {
        rowX -= colWidths[i];
        doc.text(this.processArabicText(cell.toString()), rowX, currentY + 5, {
          width: colWidths[i],
          align: 'center',
        });
      });

      currentY += 20;

      // Bottom border for row
      doc
        .moveTo(margin, currentY)
        .lineTo(doc.page.width - margin, currentY)
        .strokeColor(this.colors.border)
        .stroke();
    });

    return currentY;
  }
}

export const pdfService = new PDFService();
