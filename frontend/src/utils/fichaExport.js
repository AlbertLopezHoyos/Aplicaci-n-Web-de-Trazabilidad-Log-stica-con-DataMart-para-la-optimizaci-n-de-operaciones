import ExcelJS from 'exceljs';
import { formatDateTime } from './format';
import { BRAND, loadLogo } from './pdfBrand';

const thinBorder = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

const formatCell = (value) => {
  if (value == null || value === '') return '—';
  if (value instanceof Date) return formatDateTime(value);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return formatDateTime(value);
  }
  return String(value);
};

/** Exporta ficha de observación (dimensión 1–4) con formato institucional Salazar */
export async function exportFichaExcel({ titulo, indicador, dimension, headers, filas, indicadores = {} }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Grupo Logístico Salazar S.A.C.';
  wb.created = new Date();

  const sheetName = `Dimensión ${dimension}`.slice(0, 31);
  const ws = wb.addWorksheet(sheetName, {
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
  ws.getCell('A3').value = titulo;
  ws.getCell('A3').font = { bold: true, size: 12, color: { argb: BRAND.excelHeader } };
  ws.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(3).height = 22;

  const valorIndicador = indicadores[indicador?.toLowerCase()];
  ws.mergeCells(4, 1, 4, colCount);
  ws.getCell('A4').value =
    `Ficha de observación · Indicador ${indicador}${valorIndicador != null ? `: ${valorIndicador}${indicador === 'TPRE' ? ' min' : '%'}` : ''} · Últimos ${filas.length} registros · Generado: ${formatDateTime(new Date())}`;
  ws.getCell('A4').font = { size: 9, color: { argb: 'FF64748B' } };
  ws.getCell('A4').alignment = { horizontal: 'center', wrapText: true };

  ws.mergeCells(5, 1, 5, colCount);
  ws.getCell('A5').value =
    'Evidencia cuantitativa para preprueba y posprueba — Tesis Trazabilidad Logística 2026';
  ws.getCell('A5').font = { size: 9, italic: true, color: { argb: 'FF475569' } };
  ws.getCell('A5').alignment = { horizontal: 'center' };

  const headerRowNum = 7;
  const headerRow = ws.getRow(headerRowNum);
  headerRow.getCell(1).value = 'N°';
  headerRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  headerRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.excelHeader } };
  headerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.getCell(1).border = thinBorder;

  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 2);
    cell.value = h.label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.excelHeader } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder;
  });
  headerRow.height = 26;

  if (!filas.length) {
    ws.mergeCells(headerRowNum + 1, 1, headerRowNum + 1, colCount + 1);
    const emptyCell = ws.getCell(headerRowNum + 1, 1);
    emptyCell.value = 'Sin registros en esta dimensión.';
    emptyCell.font = { italic: true, color: { argb: 'FF64748B' } };
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
  } else {
    filas.forEach((row, idx) => {
      const dataRow = ws.getRow(headerRowNum + 1 + idx);
      const numCell = dataRow.getCell(1);
      numCell.value = idx + 1;
      numCell.alignment = { horizontal: 'center', vertical: 'middle' };
      numCell.border = thinBorder;
      if (idx % 2 === 1) {
        numCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }

      headers.forEach((h, i) => {
        const cell = dataRow.getCell(i + 2);
        cell.value = formatCell(row[h.key]);
        cell.alignment = { vertical: 'middle', wrapText: true, horizontal: 'left' };
        cell.border = thinBorder;
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      });
    });

    ws.autoFilter = {
      from: { row: headerRowNum, column: 1 },
      to: { row: headerRowNum + filas.length, column: headers.length + 1 },
    };
  }

  ws.getColumn(1).width = 6;
  headers.forEach((h, i) => {
    const maxLen = Math.max(
      h.label.length,
      ...filas.map((r) => String(formatCell(r[h.key])).length)
    );
    ws.getColumn(i + 2).width = Math.min(Math.max(maxLen + 3, 12), 44);
  });

  const lastRow = headerRowNum + Math.max(filas.length, 1) + 2;
  ws.mergeCells(lastRow, 1, lastRow, colCount + 1);
  ws.getCell(lastRow, 1).value =
    'Grupo Logístico Salazar · Ficha de observación — Uso interno';
  ws.getCell(lastRow, 1).font = { size: 8, color: { argb: 'FF94A3B8' } };
  ws.getCell(lastRow, 1).alignment = { horizontal: 'center' };

  ws.views = [{ state: 'frozen', ySplit: headerRowNum, activeCell: `A${headerRowNum + 1}` }];

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Ficha-Dim${dimension}-${indicador}-${Date.now()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export const buildHeadersFromConfig = (config) =>
  (config?.columnas || []).map((key, i) => ({
    key,
    label: config?.labels?.[i] || key.replace(/_/g, ' '),
  }));
