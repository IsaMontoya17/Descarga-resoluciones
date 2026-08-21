const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

function cargarJSON(ruta) {
  return JSON.parse(fs.readFileSync(ruta, 'utf-8'));
}

function reemplazarVariables(texto, { saludo, mes, anio, municipio }) {
  if (!texto) return '';
  return texto
    .replace(/{saludo}/g, saludo || '')
    .replace(/{mes}/g, mes || '')
    .replace(/{año}/g, anio || '')
    .replace(/{anio}/g, anio || '')
    .replace(/{municipio}/g, municipio || '');
}

function crearTransportador(config) {
  if (!config.EMAIL_USUARIO || !config.EMAIL_CLAVE) {
    throw new Error(
      'Faltan las credenciales de correo (EMAIL_USUARIO / EMAIL_CLAVE) en el archivo .env. ' +
      'Verifica que estén configuradas antes de ejecutar el envío.'
    );
  }

  return nodemailer.createTransport({
    service: config.EMAIL_SERVICIO || 'gmail',
    auth: {
      user: config.EMAIL_USUARIO,
      pass: config.EMAIL_CLAVE,
    },
  });
}

async function enviarCorreoMunicipio(transportador, {
  destinatario,
  plantilla,
  datos,
  rutaAdjunto,
  remitenteNombre,
  remitenteCorreo,
}) {
  if (!destinatario.para || destinatario.para.length === 0) {
    throw new Error('El destinatario no tiene ningún correo configurado en "para".');
  }

  const asunto = reemplazarVariables(plantilla.asunto, datos);
  const cuerpoTexto = reemplazarVariables(plantilla.cuerpo, datos);
  const cuerpoHtml = cuerpoTexto.replace(/\n/g, '<br>');

  const opciones = {
    from: remitenteNombre ? `"${remitenteNombre}" <${remitenteCorreo}>` : remitenteCorreo,
    to: destinatario.para.join(', '),
    cc: (destinatario.cc || []).join(', ') || undefined,
    bcc: (destinatario.cco || []).join(', ') || undefined,
    subject: asunto,
    text: cuerpoTexto,
    html: cuerpoHtml,
  };

  if (rutaAdjunto) {
    if (!fs.existsSync(rutaAdjunto)) {
      throw new Error(`El archivo adjunto no existe: ${rutaAdjunto}`);
    }
    opciones.attachments = [{ filename: path.basename(rutaAdjunto), path: rutaAdjunto }];
  }

  return transportador.sendMail(opciones);
}

async function enviarCorreoConReintentos(transportador, params, { intentos = 3, esperaMs = 3000 } = {}) {
  let ultimoError;
  for (let intento = 1; intento <= intentos; intento++) {
    try {
      const info = await enviarCorreoMunicipio(transportador, params);
      return { exito: true, info, intentos: intento };
    } catch (err) {
      ultimoError = err;
      if (intento < intentos) {
        await new Promise((r) => setTimeout(r, esperaMs));
      }
    }
  }
  return { exito: false, error: ultimoError.message, intentos };
}

module.exports = {
  cargarJSON,
  reemplazarVariables,
  crearTransportador,
  enviarCorreoMunicipio,
  enviarCorreoConReintentos,
};