const express = require('express');
const router = express.Router();
const { listarEjecuciones, obtenerDetalleEjecucion, exportarReporteEjecucion } = require('./historialController');
const { verificarToken } = require('../auth/authMiddleware'); 

router.get('/', verificarToken, listarEjecuciones);
router.get('/:id', verificarToken, obtenerDetalleEjecucion);
router.get('/:id/reporte', verificarToken, exportarReporteEjecucion);

module.exports = router;