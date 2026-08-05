const express = require('express');
const { randomUUID } = require('crypto');
const { ejecutarDescargaResoluciones } = require('./descargarResoluciones');

const app = express();
app.use(express.json());

// Guardamos el estado de cada ejecución en memoria por ahora (más adelante
// esto se reemplaza por una tabla en MySQL, pero para probar la API ya
// es suficiente y evita meter la base de datos antes de tiempo).
const ejecuciones = new Map();

/**
 * POST /api/descargas
 * body: { "mes": 6, "anio": 2026 }
 * Inicia la descarga en segundo plano y responde de inmediato con un id
 * para poder consultar el progreso.
 */
app.post('/api/descargas', (req, res) => {
  const { mes, anio } = req.body;

  if (!mes || !anio || mes < 1 || mes > 12) {
    return res.status(400).json({ error: 'Debes enviar "mes" (1-12) y "anio" válidos.' });
  }

  const id = randomUUID();
  const estado = {
    id,
    mes,
    anio,
    estatus: 'en_progreso', // en_progreso | completado | error
    eventos: [],
    reporte: null,
    error: null,
  };
  ejecuciones.set(id, estado);

  // No usamos "await" aquí a propósito: respondemos de inmediato al cliente
  // y dejamos que el proceso siga corriendo en segundo plano.
  ejecutarDescargaResoluciones(mes, anio, {
    headless: true, // en el servidor no necesitamos ver la ventana de Chrome
    onProgreso: (evento) => {
      estado.eventos.push({ ...evento, fecha: new Date().toISOString() });
    },
  })
    .then((reporte) => {
      estado.estatus = 'completado';
      estado.reporte = reporte;
    })
    .catch((err) => {
      estado.estatus = 'error';
      estado.error = err.message;
    });

  res.status(202).json({ id, estatus: estado.estatus });
});

/**
 * GET /api/descargas/:id
 * Devuelve el estado actual de una ejecución: en progreso, completada o con
 * error, junto con el historial de eventos (para armar la barra de
 * progreso) y el reporte final una vez termina.
 */
app.get('/api/descargas/:id', (req, res) => {
  const estado = ejecuciones.get(req.params.id);
  if (!estado) {
    return res.status(404).json({ error: 'No existe una ejecución con ese id.' });
  }
  res.json(estado);
});

const PUERTO = process.env.PUERTO || 3000;
app.listen(PUERTO, () => {
  console.log(`Servidor escuchando en http://localhost:${PUERTO}`);
});

module.exports = app;