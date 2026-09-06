import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { formatDateTime } from './format';
import { BRAND, loadLogo, drawPdfHeader, drawPdfFooter } from './pdfBrand';

const NUMERIC_KEYS = new Set([
  'cantidad',
  'dias',
  'envios_gestionados',
  'entregas',
  'incidencias_reportadas',
]);

const formatCell = (value) => {
  if (value == null || value === '') return '—';
  if (value instanceof Date) return formatDateTime(value);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return formatDateTime(value);
  }
  return String(value);
};

const buildColumnStyles = (headers) =>
  Object.fromEntries(
    headers.map((h, i) => [
      i,
      {
        halign: NUMERIC_KEYS.has(h.key) ? 'center' : 'left',
        cellWidth: NUMERIC_KEYS.has(h.key) ? 'wrap' : 'auto',
      },
    ])
  );

const drawMetaBand = (doc, pageW, y, meta, recordCount) => {
  doc.setFillColor(...BRAND.light);
  doc.roundedRect(14, y - 4, pageW - 28, meta.area ? 12 : 10, 2, 2, 'F');
  doc.setTextColor(...BRAND.muted);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${formatDateTime(new Date())}`, 18, y + 2);
  if (meta.area) doc.text(`Área solicitante: ${meta.area}`, 18, y + 7);
  doc.text(`Registros: ${recordCount}`, pageW - 18, y + 2, { align: 'right' });
  return y + (meta.area ? 16 : 14);
};

export async function exportReportePdf({ titulo, headers, filas, meta = {} }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const pageW = doc.internal.pageSize.getWidth();
  let logoData = null;
  try {
    logoData = await loadLogo();
  } catch {
    /* sin logo */
  }

  let y = drawPdfHeader(doc, logoData, {
    docTitle: 'REPORTE OPERATIVO',
    docSubtitle: titulo,
  });

  y = drawMetaBand(doc, pageW, y, meta, filas.length);

  if (meta.observaciones?.trim()) {
    doc.setTextColor(...BRAND.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Observaciones:', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.muted);
    const lines = doc.splitTextToSize(meta.observaciones.trim(), pageW - 28);
    doc.text(lines, 14, y + 5);
    y += 5 + lines.length * 4 + 4;
  }

  const footerText =
    'Grupo Logístico Salazar S.A.C. · Documento generado por el Sistema de Trazabilidad Logística';

  if (!filas.length) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BRAND.light);
    doc.roundedRect(14, y, pageW - 28, 18, 2, 2, 'FD');
    doc.setTextColor(...BRAND.muted);
    doc.setFontSize(10);
    doc.text('No hay registros para el criterio seleccionado.', pageW / 2, y + 11, { align: 'center' });
    drawPdfFooter(doc, footerText);
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14, bottom: 22 },
      head: [headers.map((h) => h.label)],
      body: filas.map((row) => headers.map((h) => formatCell(row[h.key]))),
      styles: {
        fontSize: 8,
        cellPadding: 2.8,
        overflow: 'linebreak',
        valign: 'middle',
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: BRAND.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 9,
      },
      columnStyles: buildColumnStyles(headers),
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didDrawPage: (data) => {
        drawPdfFooter(doc, footerText);
        doc.setFontSize(8);
        doc.setTextColor(...BRAND.muted);
        doc.text(
          `Página ${doc.internal.getCurrentPageInfo().pageNumber}`,
          pageW - 14,
          doc.internal.pageSize.getHeight() - 6,
          { align: 'right' }
        );
      },
    });
  }

  const slug = titulo.replace(/\s+/g, '-').slice(0, 40);
  doc.save(`Reporte-${slug}-${Date.now()}.pdf`);
}

const thinBorder = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

export async function exportReporteExcel({ titulo, headers, filas, meta = {} }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Grupo Logístico Salazar S.A.C.';
  wb.created = new Date();

  const ws = wb.addWorksheet('Reporte', {
    properties: { defaultRowHeight: 18 },
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.2, footer: 0.2 },
    },
  });

  const colCount = Math.max(headers.length, 4);

  let logoBase64 = null;
  try {
    logoBase64 = await loadLogo();
  } catch {
    /* sin logo */
  }

  ws.getRow(1).height = 28;
  ws.getRow(2).height = 28;

  if (logoBase64) {
    const imageId = wb.addImage({
      base64: logoBase64.replace(/^data:image\/\w+;base64,/, ''),
      extension: 'png',
    });
    ws.addImage(imageId, { tl: { col: 0.15, row: 0.1 }, ext: { width: 52, height: 52 } });
    ws.mergeCells(1, 2, 2, colCount);
  } else {
    ws.mergeCells(1, 1, 2, colCount);
  }

  const brandCell = logoBase64 ? ws.getCell('B1') : ws.getCell('A1');
  brandCell.value = 'Grupo Logístico Salazar S.A.C.';
  brandCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  brandCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.excelHeader } };
  brandCell.alignment = { vertical: 'middle', horizontal: 'center' };

  if (logoBase64) {
    ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.excelHeader } };
    ws.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.excelHeader } };
  }

  ws.mergeCells(3, 1, 3, colCount);
  const subCell = ws.getCell('A3');
  subCell.value = titulo;
  subCell.font = { bold: true, size: 12, color: { argb: BRAND.excelHeader } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(3).height = 22;

  ws.mergeCells(4, 1, 4, colCount);
  ws.getCell('A4').value =
    `Generado: ${formatDateTime(new Date())} · Área: ${meta.area || 'Operaciones'} · Registros: ${filas.length}`;
  ws.getCell('A4').font = { size: 9, color: { argb: 'FF64748B' } };
  ws.getCell('A4').alignment = { horizontal: 'center' };

  let headerRowNum = 6;
  if (meta.observaciones?.trim()) {
    ws.mergeCells(5, 1, 5, colCount);
    const obsCell = ws.getCell('A5');
    obsCell.value = `Observaciones: ${meta.observaciones.trim()}`;
    obsCell.font = { size: 9, italic: true, color: { argb: 'FF475569' } };
    obsCell.alignment = { wrapText: true, vertical: 'top' };
    headerRowNum = 7;
  }

  const headerRow = ws.getRow(headerRowNum);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h.label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.excelHeader } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder;
  });
  headerRow.height = 24;

  if (!filas.length) {
    ws.mergeCells(headerRowNum + 1, 1, headerRowNum + 1, colCount);
    const emptyCell = ws.getCell(headerRowNum + 1, 1);
    emptyCell.value = 'No hay registros para el criterio seleccionado.';
    emptyCell.font = { italic: true, color: { argb: 'FF64748B' } };
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(headerRowNum + 1).height = 28;
  } else {
    filas.forEach((row, idx) => {
      const dataRow = ws.getRow(headerRowNum + 1 + idx);
      headers.forEach((h, i) => {
        const cell = dataRow.getCell(i + 1);
        const raw = row[h.key];
        cell.value = NUMERIC_KEYS.has(h.key) && raw != null && raw !== '' ? Number(raw) : formatCell(raw);
        cell.alignment = {
          vertical: 'middle',
          wrapText: true,
          horizontal: NUMERIC_KEYS.has(h.key) ? 'center' : 'left',
        };
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
        cell.border = thinBorder;
      });
    });

    ws.autoFilter = {
      from: { row: headerRowNum, column: 1 },
      to: { row: headerRowNum + filas.length, column: headers.length },
    };
  }

  headers.forEach((h, i) => {
    const maxLen = Math.max(
      h.label.length,
      ...filas.map((r) => String(formatCell(r[h.key])).length)
    );
    ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 3, 12), 42);
  });

  const lastRow = headerRowNum + Math.max(filas.length, 1) + 2;
  ws.mergeCells(lastRow, 1, lastRow, colCount);
  const foot = ws.getCell(lastRow, 1);
  foot.value = 'Salazar Perú · Sistema de Trazabilidad Logística — Uso interno operativo';
  foot.font = { size: 8, color: { argb: 'FF94A3B8' } };
  foot.alignment = { horizontal: 'center' };

  ws.views = [{ state: 'frozen', ySplit: headerRowNum, activeCell: `A${headerRowNum + 1}` }];

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Reporte-${titulo.replace(/\s+/g, '-').slice(0, 40)}-${Date.now()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
