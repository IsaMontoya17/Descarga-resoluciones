const fs = require('fs');
const path = require('path');
const { clicRobusto } = require('./browser');

async function irAModuloDescargaResoluciones(page) {
  await new Promise((r) => setTimeout(r, 2000));
  await clicRobusto(page, '#mGeografico', { timeout: 30000, intentos: 5 });
  await clicRobusto(page, '#mDescargarResoluciones');
}

async function seleccionarRadioRangoFechas(page) {
  await clicRobusto(page, '#radio1in');
}

async function seleccionarFechaEnCalendario(page, campoId, dia, mes, anio) {
  const mesIndexado = mes - 1;

  await page.click(`#${campoId}`);
  await new Promise((r) => setTimeout(r, 500));

  const guid = await page.$eval(`#${campoId}`, (el) => el.getAttribute('data-guid'));
  const selectorCalendario = `div[role="calendar"][guid="${guid}"]`;

  for (let intento = 0; intento <= 36; intento++) {
    if (intento === 36) {
      throw new Error(`No se logró llegar a ${mes}/${anio} navegando el calendario (demasiados intentos).`);
    }

    const estado = await page.evaluate((sel) => {
      const cal = document.querySelector(sel);
      if (!cal) return null;
      return { mes: parseInt(cal.getAttribute('month'), 10), anio: parseInt(cal.getAttribute('year'), 10) };
    }, selectorCalendario);

    if (!estado) throw new Error('No se encontró el calendario emergente para este campo.');
    if (estado.mes === mesIndexado && estado.anio === anio) break;

    const actual = estado.anio * 12 + estado.mes;
    const objetivo = anio * 12 + mesIndexado;
    const selectorFlecha = `${selectorCalendario} .${actual < objetivo ? 'chevron-right' : 'chevron-left'}`;

    await page.click(selectorFlecha);
    await new Promise((r) => setTimeout(r, 200));
  }

  const selectorDia = `${selectorCalendario} td[day="${dia}"][month="${mesIndexado}"][year="${anio}"]`;
  await page.waitForSelector(selectorDia, { timeout: 5000 });
  await page.click(selectorDia);
  await new Promise((r) => setTimeout(r, 500));

  return page.$eval(`#${campoId}`, (el) => el.value);
}

async function establecerRangoFechasMes(page, mes, anio) {
  const dosDigitos = (n) => String(n).padStart(2, '0');
  const ultimoDia = new Date(anio, mes, 0).getDate(); // último día del mes `mes`

  const valorInicial = await seleccionarFechaEnCalendario(page, 'fechainicial', 1, mes, anio);
  const valorFinal = await seleccionarFechaEnCalendario(page, 'fechafinal', ultimoDia, mes, anio);

  const esperadoInicial = `01/${dosDigitos(mes)}/${anio}`;
  const esperadoFinal = `${dosDigitos(ultimoDia)}/${dosDigitos(mes)}/${anio}`;

  if (valorInicial !== esperadoInicial) {
    throw new Error(
      `La fecha inicial quedó como "${valorInicial}" pero se esperaba "${esperadoInicial}". Revisa el campo manualmente.`
    );
  }
  if (valorFinal !== esperadoFinal) {
    throw new Error(
      `La fecha final quedó como "${valorFinal}" pero se esperaba "${esperadoFinal}". Revisa el campo manualmente.`
    );
  }

  return { fechaInicial: valorInicial, fechaFinal: valorFinal };
}

async function obtenerListaMunicipios(page) {
  await page.waitForSelector('#codigoMunicipio', { timeout: 15000 });
  return page.evaluate(() => {
    const select = document.getElementById('codigoMunicipio');
    return Array.from(select.options)
      .filter((opt) => opt.value) // descarta la opción "Seleccione" (value="")
      .map((opt) => ({ value: opt.value, nombre: opt.label || opt.text }));
  });
}

async function esperarNuevaDescarga(carpeta, archivosPrevios, timeoutMs = 30000) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    const archivosActuales = fs.readdirSync(carpeta);
    const nuevos = archivosActuales.filter(
      (f) => !archivosPrevios.includes(f) && !f.endsWith('.crdownload')
    );
    if (nuevos.length > 0) {
      await new Promise((r) => setTimeout(r, 800)); // margen para que termine de escribirse
      return nuevos[0];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No se detectó la descarga a tiempo (timeout ${timeoutMs}ms).`);
}

async function descargarResolucionMunicipio(page, municipio, carpetaDestino) {
  const archivosPrevios = fs.readdirSync(carpetaDestino);

  await page.select('#codigoMunicipio', municipio.value);

  await clicRobusto(page, "//button[contains(., 'Descargar')]", { porXpath: true });

  const archivoDescargado = await esperarNuevaDescarga(carpetaDestino, archivosPrevios);
  return archivoDescargado;
}

async function finalizarDescarga(page) {
  await clicRobusto(page, "//button[contains(., 'Cancelar')]", { porXpath: true });
}

module.exports = {
  irAModuloDescargaResoluciones,
  seleccionarRadioRangoFechas,
  establecerRangoFechasMes,
  obtenerListaMunicipios,
  descargarResolucionMunicipio,
  finalizarDescarga,
};