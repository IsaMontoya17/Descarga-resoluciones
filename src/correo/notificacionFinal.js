const prisma = require('../config/prisma');
const { construirDetalleEjecucion } = require('../automatizacion-bcgs/historialController');
const { generarReporteExcel } = require('../automatizacion-bcgs/reportesEjecucion');
const { nombreMes } = require('../utils/utils');

async function obtenerCorreosNotificacion() {
  const filas = await prisma.correoNotificacion.findMany();
  return filas.map((f) => f.email);
}

/**
 * RF-20: se envía siempre al terminar de procesar los 113 municipios y
 * agotar los reintentos automáticos, sin importar si algunos quedaron en
 * revisión manual — el resumen adjunto refleja el estado final real.
 */
async function enviarNotificacionFinalizacion(transportador, { ejecucion, reporteEnvio, config, avisar }) {
  const destinatarios = await obtenerCorreosNotificacion();

  if (destinatarios.length === 0) {
    avisar({ tipo: 'notificacion_omitida', motivo: 'No hay correos de notificación configurados (RF-19).' });
    return { enviado: false };
  }

  const detalle = await construirDetalleEjecucion(ejecucion.id);
  const bufferExcel = await generarReporteExcel(detalle);

  const totalExitosos = reporteEnvio.exitosos.length;
  const totalRevisionManual = reporteEnvio.requieren_revision_manual.length;
  const totalOmitidos = reporteEnvio.omitidos.length;

  const asunto = `Proceso finalizado correctamente - Distribución de resoluciones ${nombreMes(ejecucion.mes)} ${ejecucion.anio}`;
  const cuerpoTexto =
    `El proceso de distribución de resoluciones catastrales de ${nombreMes(ejecucion.mes)} ${ejecucion.anio} ha finalizado.\n\n` +
    `Correos enviados exitosamente: ${totalExitosos}\n` +
    `Municipios sin movimiento (omitidos): ${totalOmitidos}\n` +
    `Municipios que requieren revisión manual: ${totalRevisionManual}\n\n` +
    `Se adjunta el reporte detallado municipio por municipio.`;

  try {
    await transportador.sendMail({
      from: config.EMAIL_REMITENTE_NOMBRE
        ? `"${config.EMAIL_REMITENTE_NOMBRE}" <${config.EMAIL_USUARIO}>`
        : config.EMAIL_USUARIO,
      to: destinatarios.join(', '),
      subject: asunto,
      text: cuerpoTexto,
      html: cuerpoTexto.replace(/\n/g, '<br>'),
      attachments: [
        { filename: `reporte_${ejecucion.mes}_${ejecucion.anio}.xlsx`, content: bufferExcel },
      ],
    });
    avisar({ tipo: 'notificacion_enviada', destinatarios: destinatarios.length });
    return { enviado: true };
  } catch (err) {
    // Un fallo aquí no debe tumbar el proceso completo: el envío a los
    // municipios ya terminó exitosamente, esto es solo un aviso adicional.
    avisar({ tipo: 'notificacion_error', error: err.message });
    return { enviado: false, error: err.message };
  }
}

module.exports = { enviarNotificacionFinalizacion, obtenerCorreosNotificacion };