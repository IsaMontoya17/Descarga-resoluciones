const jwt = require('jsonwebtoken');
const config = require('../config/config');

function verificarToken(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No se proporcionó un token de autenticación.' });
  }

  const token = header.split(' ')[1];

  try {
    req.usuario = jwt.verify(token, config.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

module.exports = { verificarToken };