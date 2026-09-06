/** Normaliza textos con mojibake frecuente en Windows/MySQL */
export const fixMojibake = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/logÃ­stico/gi, 'logístico')
    .replace(/log\s*\|\s*ístico/gi, 'logístico')
    .replace(/log\s*\|\s*Ã­stico/gi, 'logístico')
    .replace(/GestiÃ³n/g, 'Gestión')
    .replace(/envÃ­os/gi, 'envíos')
    .replace(/trÃ¡nsito/gi, 'tránsito')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã/g, 'í')
    .replace(/\uFFFD/g, '');
};
