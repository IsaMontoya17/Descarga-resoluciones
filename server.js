const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { randomUUID } = require('crypto');
const cors = require('cors');
const { ejecutarDescargaResoluciones } = require('./src/automatizacion-bcgs/descargarResoluciones');
const { ejecutarEnvioCorreos } = require('./src/correo/enviarCorreos');
const { login } = require('./src/auth/authController');

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  socket.on('unirse_ejecucion', (id) => {
    socket.join(id);
  });
});

const ejecuciones = new Map();
let hayEjecucionEnProgreso = false;

app.post('/api/auth/login', login);

app.post('/api/descargas', (req, res) => {
  const { mes, anio } = req.body;

  if (!mes || !anio || mes < 1 || mes > 12) {
    return res.status(400).json({ error: 'Debes enviar "mes" (1-12) y "anio" válidos.' });
  }

  if (hayEjecucionEnProgreso) {
    return res.status(409).json({ error: 'Ya existe una ejecución en progreso. Espera a que finalice.' });
  }

  hayEjecucionEnProgreso = true;

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

  const emitirYGuardar = (evento) => {
    const eventoConFecha = { ...evento, fecha: new Date().toISOString() };
    estado.eventos.push(eventoConFecha);
    io.to(id).emit('progreso', eventoConFecha);
  };

  ejecutarDescargaResoluciones(mes, anio, {
    headless: true,
    onProgreso: emitirYGuardar,
  })
    .then((reporteDescarga) => {
      emitirYGuardar({ tipo: 'iniciando_envio_correos' });
      return ejecutarEnvioCorreos(mes, anio, {
        onProgreso: emitirYGuardar,
      }).then((reporteEnvio) => {
        estado.estatus = 'completado';
        estado.reporte = { descarga: reporteDescarga, envio: reporteEnvio };
        io.to(id).emit('estado_final', { estatus: 'completado', reporte: estado.reporte });
      });
    })
    .catch((err) => {
      console.error('Error en la ejecución:', err.message);
      estado.estatus = 'error';
      estado.error = err.message;
      io.to(id).emit('estado_final', { estatus: 'error', error: err.message });
    })
    .finally(() => {
      hayEjecucionEnProgreso = false;
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
server.listen(PUERTO, () => {
  console.log(`Servidor escuchando en http://localhost:${PUERTO}`);
});

module.exports = app;