const prisma = require('../config/prisma');
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function listarCorreosNotificacion(req, res) {
  try {
    const correos = await prisma.correoNotificacion.findMany({ orderBy: { id: 'asc' } });
    res.json(correos);
  } catch (err) {
    console.error('Error al listar correos de notificación:', err.message);
    res.status(500).json({ error: 'No se pudo obtener la lista de correos de notificación.' });
  }
}

async function agregarCorreoNotificacion(req, res) {
  const limpio = String(req.body?.email || '').trim();
  if (!REGEX_EMAIL.test(limpio)) {
    return res.status(400).json({ error: 'El correo no tiene un formato válido.' });
  }

  try {
    const existente = await prisma.correoNotificacion.findFirst({ where: { email: limpio } });
    if (existente) {
      return res.status(409).json({ error: 'Ese correo ya está configurado.' });
    }
    const creado = await prisma.correoNotificacion.create({ data: { email: limpio } });
    res.status(201).json(creado);
  } catch (err) {
    console.error('Error al agregar correo de notificación:', err.message);
    res.status(500).json({ error: 'No se pudo agregar el correo de notificación.' });
  }
}

async function eliminarCorreoNotificacion(req, res) {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Id inválido.' });

  try {
    await prisma.correoNotificacion.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error('Error al eliminar correo de notificación:', err.message);
    res.status(500).json({ error: 'No se pudo eliminar el correo de notificación.' });
  }
}

module.exports = { listarCorreosNotificacion, agregarCorreoNotificacion, eliminarCorreoNotificacion };