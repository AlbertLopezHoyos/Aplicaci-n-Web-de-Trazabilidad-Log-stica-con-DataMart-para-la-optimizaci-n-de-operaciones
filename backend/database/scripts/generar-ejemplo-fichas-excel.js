/**
 * Genera Excel de referencia con las 4 fichas de observación (posprueba).
 * Una fila = una jornada operativa (20 días, 1–20 set 2026).
 * Uso: node database/scripts/generar-ejemplo-fichas-excel.js
 */
const path = require('path');
const ExcelJS = require('exceljs');

const OUT = path.join(__dirname, '../../../docs/ejemplo-fichas-posprueba-v2.xlsx');

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
const NOTE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

const pad = (n) => String(n).padStart(2, '0');
const fechaFicha = (dia) => `${pad(dia)}/09/2026`;
const redondear = (v) => Math.round(v * 100) / 100;
const oNa = (n, d, pct = false) => {
  if (!d) return 'N/A';
  return redondear(pct ? (n / d) * 100 : n / d);
};

const jornadas = Array.from({ length: 20 }, (_, i) => {
  const dia = i + 1;
  const nerd = 2 + (i % 4);
  const sumaTre = redondear(nerd * (3.2 + (i % 5) * 0.15));
  const rce = i % 5 === 0 ? 1 : 0;
  const eea = Math.max(0, nerd - (i % 7 === 0 ? 1 : 0));
  const tioed = i % 4 === 0 ? 0 : 1;
  const nioc = tioed && i % 6 !== 0 ? 1 : 0;
  return { dia, nerd, sumaTre, rce, eea, tioed, nioc };
});

const FICHAS = [
  {
    sheet: 'Dim 1 - TPDRE',
    titulo: 'Dimensión 1 — Eficiencia operativa (TPDRE)',
    indicador: 'TPDRE = ΣTRE / NERD (media de los 20 promedios diarios, min)',
    headers: [
      'N°',
      'Fecha',
      'Número de envíos registrados (NERD)',
      'Sumatoria de tiempos de registro (min) (ΣTRE)',
      'Tiempo promedio diario de registro de envíos (min) (TPDRE)',
    ],
    rows: jornadas.map((j) => [
      j.dia,
      fechaFicha(j.dia),
      j.nerd,
      j.sumaTre,
      oNa(j.sumaTre, j.nerd),
    ]),
  },
  {
    sheet: 'Dim 2 - PDRE',
    titulo: 'Dimensión 2 — Calidad de la información (PDRE)',
    indicador: 'PDRE = (RCE / TREvD) × 100 (media de los 20 porcentajes diarios)',
    headers: [
      'N°',
      'Fecha',
      'Total de registros evaluados (TREvD)',
      'Registros con error (RCE)',
      'Registros sin error',
      'Porcentaje diario de registros con error (%) (PDRE)',
    ],
    rows: jornadas.map((j) => [
      j.dia,
      fechaFicha(j.dia),
      j.nerd,
      j.rce,
      j.nerd - j.rce,
      oNa(j.rce, j.nerd, true),
    ]),
  },
  {
    sheet: 'Dim 3 - PDEEA',
    titulo: 'Dimensión 3 — Control y seguimiento (PDEEA)',
    indicador: 'PDEEA = (EEA / TEED) × 100 (media de los 20 porcentajes diarios)',
    headers: [
      'N°',
      'Fecha',
      'Total de envíos evaluados (TEED)',
      'Envíos con estado actualizado (EEA)',
      'Envíos con estado no actualizado',
      'Porcentaje diario de envíos con estado actualizado (%) (PDEEA)',
    ],
    rows: jornadas.map((j) => [
      j.dia,
      fechaFicha(j.dia),
      j.nerd,
      j.eea,
      j.nerd - j.eea,
      oNa(j.eea, j.nerd, true),
    ]),
  },
  {
    sheet: 'Dim 4 - PDIOIC',
    titulo: 'Dimensión 4 — Gestión de la información operativa (PDIOIC)',
    indicador: 'PDIOIC = (NIOC / TIOED) × 100 · Si TIOED = 0 el día se registra N/A (no 0)',
    headers: [
      'N°',
      'Fecha',
      'Total de incidencias evaluadas (TIOED)',
      'Incidencias con información completa (NIOC)',
      'Incidencias con información incompleta',
      'Porcentaje diario de incidencias con información completa (%) (PDIOIC)',
    ],
    rows: jornadas.map((j) => [
      j.dia,
      fechaFicha(j.dia),
      j.tioed,
      j.nioc,
      Math.max(0, j.tioed - j.nioc),
      oNa(j.nioc, j.tioed, true),
    ]),
  },
];

const addSheet = (wb, ficha) => {
  const ws = wb.addWorksheet(ficha.sheet, {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  ws.mergeCells(1, 1, 1, ficha.headers.length);
  ws.getCell('A1').value = 'Grupo Logístico Salazar S.A.C. — Ficha de observación (ejemplo posprueba)';
  ws.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FF1E3A5F' } };
  ws.getRow(1).height = 22;

  ws.mergeCells(2, 1, 2, ficha.headers.length);
  ws.getCell('A2').value = ficha.titulo;
  ws.getCell('A2').font = { bold: true, size: 11 };
  ws.getRow(2).height = 20;

  ws.mergeCells(3, 1, 3, ficha.headers.length);
  ws.getCell('A3').value = ficha.indicador;
  ws.getCell('A3').font = { italic: true, size: 9, color: { argb: 'FF475569' } };
  ws.getCell('A3').fill = NOTE_FILL;
  ws.getRow(3).height = 18;

  const headerRow = ws.getRow(4);
  ficha.headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' },
    };
  });
  headerRow.height = 28;

  ficha.rows.forEach((row, ri) => {
    const excelRow = ws.getRow(5 + ri);
    row.forEach((val, ci) => {
      const cell = excelRow.getCell(ci + 1);
      cell.value = val === '' ? '—' : val;
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  ws.columns.forEach((col, i) => {
    col.width = Math.min(28, Math.max(12, (ficha.headers[i]?.length || 10) + 2));
  });
};

const run = async () => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Tesis UCV 2026 — Ejemplo referencial';
  wb.created = new Date();

  const portada = wb.addWorksheet('Instrucciones', { properties: { tabColor: { argb: 'FF1E3A5F' } } });
  portada.getColumn(1).width = 100;
  const notas = [
    'EJEMPLO DE FICHAS DE OBSERVACIÓN — POSPRUEBA (20 jornadas, 1–20 set 2026)',
    '',
    'Unidad de análisis: jornada operativa. Cada fila es un día.',
    'Ventana: 1 al 20 de septiembre de 2026 (incluye domingos; si no hay datos, N/A).',
    'Los indicadores del postest son la media de los 20 promedios diarios.',
    'TPDRE · PDRE · PDEEA · PDIOIC',
    '',
    'Cada hoja tiene 20 filas. En la app exporte desde Investigación → Fichas.',
    '',
    'DIMENSIÓN 4 (PDIOIC): si un día no tiene incidencias, el porcentaje es N/A (no 0).',
  ];
  notas.forEach((t, i) => {
    const cell = portada.getCell(i + 1, 1);
    cell.value = t;
    cell.font = i === 0 ? { bold: true, size: 14 } : { size: 11 };
  });

  FICHAS.forEach((f) => addSheet(wb, f));
  await wb.xlsx.writeFile(OUT);
  console.log(`✓ Excel generado: ${OUT}`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
