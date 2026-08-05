require('dotenv').config();

module.exports = {
  URL_BCGS: process.env.URL_BCGS,
  USUARIO_SISTEMA: process.env.USUARIO_SISTEMA,
  CLAVE_SISTEMA: process.env.CLAVE_SISTEMA,
  TIMEOUT_ESPERA: parseInt(process.env.TIMEOUT_ESPERA || '180', 10),
  CARPETA_PRINCIPAL: process.env.CARPETA_PRINCIPAL || 'envio_correos_mensuales',
};
