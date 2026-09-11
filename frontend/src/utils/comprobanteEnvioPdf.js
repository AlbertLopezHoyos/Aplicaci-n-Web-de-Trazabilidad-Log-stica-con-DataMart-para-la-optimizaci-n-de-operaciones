import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate, formatDateTime } from './format';
import { labelCliente, nombreCliente, docCliente, telefonoCliente } from './cliente';
import { BRAND, loadLogo, drawPdfHeader, drawPdfFooter } from './pdfBrand';

/** Genera y descarga el comprobante PDF del envío. */
export async function descargarComprobanteEnvio(envio) {
  if (!envio) return;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let logoData;
  try {
    logoData = await loadLogo();
  } catch {
    logoData = null;
  }

  let y = drawPdfHeader(doc, logoData, {
    docTitle: 'COMPROBANTE DE ENVÍO',
    tagline: 'Lima, Perú · comprobante de envío',
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(envio.codigo_envio || '—', pageW - 14, 28, { align: 'right' });

  const estadoNombre = envio.estadoActual?.nombre || 'Recibido';
  doc.setFillColor(...BRAND.light);
  doc.roundedRect(14, y - 4, pageW - 28, 10, 2, 2, 'F');
  doc.setTextColor(...BRAND.primary);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Estado: ${estadoNombre}`, 18, y + 2.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND.muted);
  doc.text(`Emitido: ${formatDateTime(new Date())}`, pageW - 18, y + 2.5, { align: 'right' });
  y += 16;

  doc.setTextColor(...BRAND.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Quien envía', 14, y);
  y += 6;

  const cliente = envio.cliente || {};
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42, textColor: BRAND.muted } },
    body: [
      ['Nombre', nombreCliente(cliente)],
      ['DNI', docCliente(cliente)],
      ['Teléfono', telefonoCliente(cliente)],
    ],
  });
  y = doc.lastAutoTable.finalY + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.primary);
  doc.text('Quien recibe', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42, textColor: BRAND.muted } },
    body: [
      ['Nombre', envio.nombre_destinatario || '—'],
      ['DNI', envio.dni_destinatario || '—'],
      ['Teléfono', envio.telefono_destinatario || '—'],
    ],
  });
  y = doc.lastAutoTable.finalY + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.primary);
  doc.text('Datos del envío', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    headStyles: {
      fillColor: BRAND.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: { fontSize: 10, cellPadding: 3 },
    head: [['Concepto', 'Detalle']],
    body: [
      ['Origen', envio.origen || '—'],
      ['Destino', envio.destino || '—'],
      ['Fecha de registro', formatDate(envio.fecha_registro)],
      ['Entrega estimada', formatDate(envio.fecha_estimada_entrega)],
      ['Tipo de carga', envio.tipo_carga || '—'],
      ['Peso', envio.peso_kg != null ? `${envio.peso_kg} kg` : '—'],
      ['N° paquetes', String(envio.numero_paquetes ?? 1)],
      ...(envio.tiempo_registro_min != null
        ? [['Tiempo de registro', `${envio.tiempo_registro_min} min`]]
        : []),
      ...(envio.observaciones ? [['Observaciones', envio.observaciones]] : []),
    ],
  });
  y = doc.lastAutoTable.finalY + 12;

  const totalBoxW = 88;
  const totalBoxX = pageW - 14 - totalBoxW;
  doc.setFillColor(...BRAND.accent);
  doc.roundedRect(totalBoxX, y, totalBoxW, 22, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('TOTAL DEL ENVÍO', totalBoxX + totalBoxW / 2, y + 8, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(formatCurrency(envio.total_envio), totalBoxX + totalBoxW / 2, y + 17, { align: 'center' });

  drawPdfFooter(
    doc,
    `Documento generado por el Sistema de Trazabilidad Logística · Cliente: ${labelCliente(cliente)} · Código: ${envio.codigo_envio}`
  );

  doc.save(`Comprobante-${envio.codigo_envio || 'envio'}.pdf`);
}
