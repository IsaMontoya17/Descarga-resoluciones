const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  URL_BCGS: process.env.URL_BCGS,
  USUARIO_SISTEMA: process.env.USUARIO_SISTEMA,
  CLAVE_SISTEMA: process.env.CLAVE_SISTEMA,
  TIMEOUT_ESPERA: parseInt(process.env.TIMEOUT_ESPERA || '180', 10),
  CARPETA_PRINCIPAL: process.env.CARPETA_PRINCIPAL || 'envio_correos_mensuales',

  EMAIL_SERVICIO: process.env.EMAIL_SERVICIO || 'gmail',
  EMAIL_USUARIO: process.env.EMAIL_USUARIO,
  EMAIL_CLAVE: process.env.EMAIL_CLAVE,
  EMAIL_REMITENTE_NOMBRE: process.env.EMAIL_REMITENTE_NOMBRE || 'Gerencia de Catastro - Gobernación de Antioquia',
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
};