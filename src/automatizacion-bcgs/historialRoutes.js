const express = require('express');
const router = express.Router();
const { listarEjecuciones, obtenerDetalleEjecucion } = require('./historialController');
const { verificarToken } = require('../auth/authMiddleware'); // AJUSTA la ruta si tu middleware vive en otro archivo

router.get('/', verificarToken, listarEjecuciones);
router.get('/:id', verificarToken, obtenerDetalleEjecucion);

module.exports = router;