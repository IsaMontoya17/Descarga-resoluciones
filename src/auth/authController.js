const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const config = require('../config/config');

async function login(req, res) {
  const { usuario, password } = req.body;

  if (!usuario || !password) {
    return res.status(400).json({ error: 'Debes enviar "usuario" y "password".' });
  }

  const cuenta = await prisma.usuario.findUnique({ where: { usuario } });

  if (!cuenta) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }

  const passwordValida = await bcrypt.compare(password, cuenta.passwordHash);

  if (!passwordValida) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }

  const token = jwt.sign(
    { id: cuenta.id, usuario: cuenta.usuario, rol: cuenta.rol },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );

  res.json({
    token,
    usuario: { id: cuenta.id, nombre: cuenta.nombre, usuario: cuenta.usuario, rol: cuenta.rol },
  });
}

module.exports = { login };