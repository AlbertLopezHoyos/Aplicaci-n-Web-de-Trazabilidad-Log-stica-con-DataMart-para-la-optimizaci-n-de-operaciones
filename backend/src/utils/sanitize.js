/** Sanitización básica de strings para prevenir XSS en almacenamiento */
const sanitizeString = (str) => {
  if (str === null || str === undefined) return str;
  if (typeof str !== 'string') return str;
  return str
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 5000);
};

const sanitizeObject = (obj, fields = []) => {
  const result = { ...obj };
  fields.forEach((f) => {
    if (result[f] !== undefined) result[f] = sanitizeString(result[f]);
  });
  return result;
};

module.exports = { sanitizeString, sanitizeObject };
