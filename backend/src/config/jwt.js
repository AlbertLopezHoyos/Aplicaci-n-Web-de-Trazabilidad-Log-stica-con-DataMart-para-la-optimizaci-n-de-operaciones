module.exports = {
  secret: process.env.JWT_SECRET || 'dev_secret_change_in_production',
  expiresIn: process.env.JWT_EXPIRES_IN || '8h',
};
