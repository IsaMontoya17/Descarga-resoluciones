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

  const reporte = { exitosos: [], sin_resoluciones: [], fallidos: [] };

  try {
    // 1. Login (entrando por cualquier municipio de origen)
    await loginBcgs(page, config.URL_BCGS, config.USUARIO_SISTEMA, config.CLAVE_SISTEMA, 'ABEJORRAL', {
      carpetaDebug: rutaCarpetaMes,
    });
    avisar({ tipo: 'sesion_iniciada' });

    // 2. Ir al módulo de descarga de resoluciones
    await irAModuloDescargaResoluciones(page);
    await seleccionarRadioRangoFechas(page);

    // 3. Establecer el rango de fechas del mes requerido
    const { fechaInicial, fechaFinal } = await establecerRangoFechasMes(page, mes, anio);
    avisar({ tipo: 'fechas_establecidas', fechaInicial, fechaFinal });

    // 4. Obtener la lista de municipios del desplegable
    const municipios = await obtenerListaMunicipios(page, { carpetaDebug: rutaCarpetaMes });
    avisar({ tipo: 'municipios_encontrados', total: municipios.length });

    // 5. Procesar municipio por municipio
    for (let i = 0; i < municipios.length; i++) {
      const municipio = municipios[i];
      avisar({ tipo: 'descargando', indice: i + 1, total: municipios.length, municipio: municipio.nombre });

      try {
        const resultado = await descargarResolucionMunicipio(page, municipio, rutaCarpetaMes);

        if (resultado === 'SIN_RESOLUCIONES') {
          reporte.sin_resoluciones.push({ municipio: municipio.nombre, codigo: municipio.value });
          avisar({ tipo: 'descarga_sin_datos', municipio: municipio.nombre });
        } else {
          reporte.exitosos.push({ municipio: municipio.nombre, codigo: municipio.value, archivo: resultado });
          avisar({ tipo: 'descarga_ok', municipio: municipio.nombre, archivo: resultado });
        }
      } catch (err) {
        reporte.fallidos.push({ municipio: municipio.nombre, codigo: municipio.value, error: err.message });
        avisar({ tipo: 'descarga_error', municipio: municipio.nombre, error: err.message });
      }
    }

    // 6. Cerrar la ventana del módulo
    await finalizarDescarga(page);
  } finally {
    await browser.close();
  }

  // 7. Guardar el informe de ejecución consolidado
  const rutaReporte = path.join(rutaCarpetaMes, '_reporte_descarga.json');
  fs.writeFileSync(rutaReporte, JSON.stringify(reporte, null, 2), 'utf-8');

  avisar({
    tipo: 'finalizado',
    exitosos: reporte.exitosos.length,
    sin_resoluciones: reporte.sin_resoluciones.length,
    fallidos: reporte.fallidos.length,
    rutaReporte,
  });

  return reporte;
}

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