const path = require('path');
const fs = require('fs');
const config = require('./config');
const { nombreMes } = require('./utils');
const {
  iniciarNavegador,
  configurarCarpetaDescargas,
  crearCarpetaMes,
} = require('./browser');
const { loginBcgs } = require('./bcgsBot');
const {
  irAModuloDescargaResoluciones,
  seleccionarRadioRangoFechas,
  establecerRangoFechasMes,
  obtenerListaMunicipios,
  descargarResolucionMunicipio,
  finalizarDescarga,
} = require('./resolucionesBot');

/**
 * Ejecuta la descarga de resoluciones para un mes/año dado.
 * mes: número de 1 a 12. anio: ej. 2026.
 * onProgreso (opcional): función que se llama en cada paso importante,
 * con un objeto { tipo, ...datos }, para que quien use este módulo
 * (por ejemplo el backend) pueda enterarse del avance sin depender
 * de leer la consola.
 */
async function ejecutarDescargaResoluciones(mes, anio, { onProgreso, headless = false } = {}) {
  const avisar = (evento) => {
    console.log(evento);
    if (onProgreso) onProgreso(evento);
  };

  const rutaCarpetaMes = path.resolve(crearCarpetaMes(config.CARPETA_PRINCIPAL, nombreMes(mes), anio));
  avisar({ tipo: 'carpeta_lista', ruta: rutaCarpetaMes });

  const { browser, page } = await iniciarNavegador({ headless });
  await configurarCarpetaDescargas(page, rutaCarpetaMes);

  const reporte = { exitosos: [], fallidos: [] };

  try {
    // 1. Login (entrando por cualquier municipio, ej. Abejorral)
    await loginBcgs(page, config.URL_BCGS, config.USUARIO_SISTEMA, config.CLAVE_SISTEMA, 'ABEJORRAL', {
      carpetaDebug: rutaCarpetaMes,
    });
    avisar({ tipo: 'sesion_iniciada' });

    // 2. Ir al módulo de descarga de resoluciones
    await irAModuloDescargaResoluciones(page);
    await seleccionarRadioRangoFechas(page);

    // 3. Establecer el rango de fechas del mes pedido
    const { fechaInicial, fechaFinal } = await establecerRangoFechasMes(page, mes, anio);
    avisar({ tipo: 'fechas_establecidas', fechaInicial, fechaFinal });

    // 4. Obtener la lista de municipios directamente del desplegable
    const municipios = await obtenerListaMunicipios(page, { carpetaDebug: rutaCarpetaMes });
    avisar({ tipo: 'municipios_encontrados', total: municipios.length });

    // 5. Descargar municipio por municipio
    for (let i = 0; i < municipios.length; i++) {
      const municipio = municipios[i];
      avisar({ tipo: 'descargando', indice: i + 1, total: municipios.length, municipio: municipio.nombre });

      try {
        const archivo = await descargarResolucionMunicipio(page, municipio, rutaCarpetaMes);
        reporte.exitosos.push({ municipio: municipio.nombre, archivo });
        avisar({ tipo: 'descarga_ok', municipio: municipio.nombre, archivo });
      } catch (err) {
        // Si un municipio falla, lo registramos y seguimos con los demás
        // (así un solo error no detiene todo el proceso, como hablamos)
        reporte.fallidos.push({ municipio: municipio.nombre, error: err.message });
        avisar({ tipo: 'descarga_error', municipio: municipio.nombre, error: err.message });
      }
    }

    // 6. Cerrar el formulario de descarga
    await finalizarDescarga(page);
  } finally {
    await browser.close();
  }

  // 7. Guardar un reporte de la ejecución en la misma carpeta del mes
  const rutaReporte = path.join(rutaCarpetaMes, '_reporte_descarga.json');
  fs.writeFileSync(rutaReporte, JSON.stringify(reporte, null, 2), 'utf-8');

  avisar({ tipo: 'finalizado', exitosos: reporte.exitosos.length, fallidos: reporte.fallidos.length, rutaReporte });

  return reporte;
}

// Ejemplo de uso: node descargarResoluciones.js 6 2026  (junio 2026)
if (require.main === module) {
  const [, , mesArg, anioArg] = process.argv;
  const mes = parseInt(mesArg, 10);
  const anio = parseInt(anioArg, 10);

  if (!mes || !anio) {
    console.error('Uso: node descargarResoluciones.js <mes> <año>   ej: node descargarResoluciones.js 6 2026');
    process.exit(1);
  }

  ejecutarDescargaResoluciones(mes, anio).catch((err) => {
    console.error('Error en el flujo principal:', err);
    process.exit(1);
  });
}

module.exports = { ejecutarDescargaResoluciones };