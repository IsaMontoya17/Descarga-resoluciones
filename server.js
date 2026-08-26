const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { randomUUID } = require('crypto');
const cors = require('cors');
const { ejecutarDescargaResoluciones } = require('./src/automatizacion-bcgs/descargarResoluciones');
const { ejecutarEnvioCorreos, reintentarEnvioMunicipios } = require('./src/correo/enviarCorreos');
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

/**
 * POST /api/descargas/:id/reintentar-envio
 * body: { "codigos": ["895", "002"] }  — opcional; si se omite o viene vacío,
 * reintenta TODOS los municipios que actualmente estén en "requieren_revision_manual".
 *
 * Responde de inmediato con 202 (igual que el POST original de /api/descargas) y
 * deja correr el reintento en segundo plano, emitiendo eventos "progreso" y un
 * "estado_final" al terminar con el reporte de envío ya actualizado.
 */
app.post('/api/descargas/:id/reintentar-envio', (req, res) => {
  const estado = ejecuciones.get(req.params.id);
  if (!estado) {
    return res.status(404).json({ error: 'No existe una ejecución con ese id.' });
  }

  if (estado.estatus !== 'completado') {
    return res.status(409).json({ error: 'Solo se puede reintentar el envío de una ejecución ya completada.' });
  }

  if (hayEjecucionEnProgreso) {
    return res.status(409).json({ error: 'Hay una ejecución o reintento en progreso. Espera a que finalice.' });
  }

  const pendientes = estado.reporte?.envio?.requieren_revision_manual ?? [];
  if (pendientes.length === 0) {
    return res.status(400).json({ error: 'No hay municipios pendientes de revisión manual en esta ejecución.' });
  }

  const { codigos } = req.body || {};
  const codigosObjetivo = Array.isArray(codigos) && codigos.length > 0
    ? codigos
    : pendientes.map((m) => m.codigo);

  const invalidos = codigosObjetivo.filter(
    (c) => !pendientes.some((m) => String(m.codigo) === String(c))
  );
  if (invalidos.length > 0) {
    return res.status(400).json({
      error: `Los siguientes códigos no están pendientes de revisión manual: ${invalidos.join(', ')}`,
    });
  }

  hayEjecucionEnProgreso = true;

  const emitirYGuardar = (evento) => {
    const eventoConFecha = { ...evento, fecha: new Date().toISOString() };
    estado.eventos.push(eventoConFecha);
    io.to(req.params.id).emit('progreso', eventoConFecha);
  };

  reintentarEnvioMunicipios(estado.mes, estado.anio, codigosObjetivo, {
    onProgreso: emitirYGuardar,
  })
    .then((reporteEnvioActualizado) => {
      estado.reporte = { ...estado.reporte, envio: reporteEnvioActualizado };
      io.to(req.params.id).emit('estado_final', { estatus: 'completado', reporte: estado.reporte });
    })
    .catch((err) => {
      console.error('Error al reintentar el envío:', err.message);
      io.to(req.params.id).emit('estado_final', {
        estatus: 'completado',
        reporte: estado.reporte,
        errorReintento: err.message,
      });
    })
    .finally(() => {
      hayEjecucionEnProgreso = false;
    });

  res.status(202).json({ mensaje: 'Reintento de envío iniciado.', codigos: codigosObjetivo });
});

const PUERTO = process.env.PUERTO || 3000;
server.listen(PUERTO, () => {
  console.log(`Servidor escuchando en http://localhost:${PUERTO}`);
});

module.exports = app;