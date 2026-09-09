import logoSrc from '../assets/logo-salazar-peru-1.png';

/** Paleta institucional tomada del isotipo de Grupo Logístico Salazar. */
export const BRAND = {
  primary: [131, 58, 60], // #833A3C rojo ladrillo
  accent: [134, 136, 138], // #86888A gris corporativo
  muted: [100, 116, 139],
  light: [241, 245, 249],
  excelHeader: 'FF833A3C',
  excelAccent: 'FF86888A',
};

export const loadLogo = () =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = logoSrc;
  });

/** Encabezado institucional PDF (altura ~42mm) */
export const drawPdfHeader = (doc, logoData, { docTitle, docSubtitle, tagline }) => {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pageW, 42, 'F');

  if (logoData) {
    doc.addImage(logoData, 'PNG', 14, 8, 26, 26);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Grupo Logístico Salazar S.A.C.', logoData ? 44 : 14, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Salazar Perú · Trazabilidad logística', logoData ? 44 : 14, 22);
  doc.text(tagline || 'Lima, Perú · Sistema de reportes operativos', logoData ? 44 : 14, 28);

  if (docTitle) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(docTitle, pageW - 14, 18, { align: 'right' });
  }
  if (docSubtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(docSubtitle, pageW - 14, 26, { align: 'right' });
  }

  return 52;
};

export const drawPdfFooter = (doc, text) => {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...BRAND.light);
  doc.line(14, pageH - 18, pageW - 14, pageH - 18);
  doc.setTextColor(...BRAND.muted);
  doc.setFontSize(8);
  doc.text(text, pageW / 2, pageH - 12, { align: 'center' });
};
