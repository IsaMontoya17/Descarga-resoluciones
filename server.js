const express = require('express');
const { randomUUID } = require('crypto');
const { ejecutarDescargaResoluciones } = require('./descargarResoluciones');

const app = express();
app.use(express.json());

const ejecuciones = new Map();

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
    estatus: 'en_progreso', 
    eventos: [],
    reporte: null,
    error: null,
  };
  ejecuciones.set(id, estado);

  ejecutarDescargaResoluciones(mes, anio, {
    headless: true, 
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