const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const prisma = require('../config/prisma');
const { obtenerOCrearMunicipio } = require('../utils/municipios');
const { nombreMes } = require('../utils/utils');
const {
  cargarJSON,
  crearTransportador,
  enviarCorreoConReintentos,
} = require('./correoBot');

async function ejecutarEnvioCorreos(mes, anio, { onProgreso } = {}) {
  const avisar = (evento) => {
    console.log(evento);
    if (onProgreso) onProgreso(evento);
  };

  function obtenerSaludo() {
    const hora = new Date().getHours();
    return hora < 12 ? 'Buenos días' : 'Buenas tardes';
  }

  const rutaCarpetaMes = path.resolve(__dirname, '../automatizacion-bcgs/envio_correos_mensuales', `${nombreMes(mes)}_${anio}`);
  const rutaReporteDescarga = path.join(rutaCarpetaMes, '_reporte_descarga.json');

  if (!fs.existsSync(rutaReporteDescarga)) {
    throw new Error(
      `No existe el reporte de descarga para ${nombreMes(mes)}_${anio}. Ejecuta primero descargarResoluciones.js.`
    );
  }

  const reporteDescarga = cargarJSON(rutaReporteDescarga);

  const ejecucion = await prisma.ejecucion.findFirst({
    where: { mes, anio },
    orderBy: { id: 'desc' },
  });

  if (!ejecucion) {
    throw new Error(
      `No se encontró una ejecución registrada para ${nombreMes(mes)}/${anio} en la base de datos. ` +
      `Ejecuta primero descargarResoluciones.js.`
    );
  }

  const rutaPlantilla = path.resolve(__dirname, 'plantillaCorreo.json');
  const rutaDestinatarios = path.resolve(__dirname, 'destinatariosPrueba.json');

  let plantilla;
  try {
    plantilla = cargarJSON(rutaPlantilla);
  } catch (err) {
    throw new Error(
      `No se pudo cargar la plantilla de correo (${rutaPlantilla}). Verifica que el archivo exista y tenga un formato JSON válido. Detalle: ${err.message}`
    );
  }

  if (!plantilla.asunto || !plantilla.cuerpo) {
    throw new Error(
      `La plantilla de correo (${rutaPlantilla}) está incompleta: debe tener las claves "asunto" y "cuerpo" con contenido. Revisa el archivo antes de continuar.`
    );
  }

  let destinatarios;
  try {
    destinatarios = cargarJSON(rutaDestinatarios);
  } catch (err) {
    throw new Error(
      `No se pudo cargar el archivo de destinatarios (${rutaDestinatarios}). Si no existe, cópialo desde destinatariosPrueba.example.json y complétalo con los correos reales. Detalle: ${err.message}`
    );
  }

  const transportador = crearTransportador(config);

  const reporteEnvio = { exitosos: [], fallidos: [], omitidos: [] };

  reporteDescarga.sin_resoluciones.forEach((m) => {
    reporteEnvio.omitidos.push({ municipio: m.municipio, codigo: m.codigo, motivo: 'sin_movimientos' });
  });
  avisar({ tipo: 'omitidos_sin_movimientos', total: reporteEnvio.omitidos.length });

  const municipiosAEnviar = reporteDescarga.exitosos;
  avisar({ tipo: 'inicio_envio', total: municipiosAEnviar.length });

  for (let i = 0; i < municipiosAEnviar.length; i++) {
    const item = municipiosAEnviar[i];
    const codigoLimpio = String(item.codigo).replace(/\D/g, '');
    const destinatario = destinatarios[codigoLimpio];

    avisar({ tipo: 'enviando', indice: i + 1, total: municipiosAEnviar.length, municipio: item.municipio });

    const municipioDb = await obtenerOCrearMunicipio(prisma, codigoLimpio, item.municipio);

    if (!destinatario) {
      const error = 'Sin destinatarios configurados para este municipio.';
      reporteEnvio.fallidos.push({ municipio: item.municipio, codigo: item.codigo, error });
      await prisma.resultadoEnvio.create({
        data: {
          ejecucionId: ejecucion.id,
          municipioId: municipioDb.id,
          estatus: 'fallido',
          tipoError: error,
        },
      });
      avisar({ tipo: 'envio_error', municipio: item.municipio, error });
      continue;
    }

    const rutaAdjunto = path.join(rutaCarpetaMes, item.archivo);
    const datos = {
      saludo: obtenerSaludo(),
      mes: nombreMes(mes),
      anio: String(anio),
      municipio: item.municipio,
    };

    const resultado = await enviarCorreoConReintentos(transportador, {
      destinatario,
      plantilla,
      datos,
      rutaAdjunto,
      remitenteNombre: config.EMAIL_REMITENTE_NOMBRE,
      remitenteCorreo: config.EMAIL_USUARIO,
    });

    if (resultado.exito) {
      reporteEnvio.exitosos.push({ municipio: item.municipio, codigo: item.codigo, intentos: resultado.intentos });
      await prisma.resultadoEnvio.create({
        data: {
          ejecucionId: ejecucion.id,
          municipioId: municipioDb.id,
          estatus: 'exitoso',
          intentos: resultado.intentos,
        },
      });
      avisar({ tipo: 'envio_ok', municipio: item.municipio, intentos: resultado.intentos });
    } else {
      reporteEnvio.fallidos.push({ municipio: item.municipio, codigo: item.codigo, error: resultado.error });
      await prisma.resultadoEnvio.create({
        data: {
          ejecucionId: ejecucion.id,
          municipioId: municipioDb.id,
          estatus: 'fallido',
          tipoError: resultado.error,
          intentos: resultado.intentos,
        },
      });
      avisar({ tipo: 'envio_error', municipio: item.municipio, error: resultado.error });
    }
  }

  const rutaReporteEnvio = path.join(rutaCarpetaMes, '_reporte_envio.json');
  fs.writeFileSync(rutaReporteEnvio, JSON.stringify(reporteEnvio, null, 2), 'utf-8');

  console.log('\n==================================================');
  console.log(`ENVÍO DE CORREOS — ${nombreMes(mes)} ${anio}`);
  console.log(`Exitosos: ${reporteEnvio.exitosos.length}`);
  console.log(`Fallidos: ${reporteEnvio.fallidos.length}`);
  console.log(`Omitidos (sin movimientos): ${reporteEnvio.omitidos.length}`);
  console.log('==================================================\n');

  avisar({
    tipo: 'finalizado',
    exitosos: reporteEnvio.exitosos.length,
    fallidos: reporteEnvio.fallidos.length,
    omitidos: reporteEnvio.omitidos.length,
    rutaReporteEnvio,
  });

  return reporteEnvio;
}

if (require.main === module) {
  const [, , mesArg, anioArg] = process.argv;
  const mes = parseInt(mesArg, 10);
  const anio = parseInt(anioArg, 10);

  if (!mes || !anio) {
    console.error('Uso: node enviarCorreos.js <mes> <año>   ej: node enviarCorreos.js 6 2026');
    process.exit(1);
  }

  ejecutarEnvioCorreos(mes, anio).catch((err) => {
    console.error('Error en el flujo de envío de correos:', err);
    process.exit(1);
  });
}

module.exports = { ejecutarEnvioCorreos };