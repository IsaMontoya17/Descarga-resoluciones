const prisma = require('../config/prisma');

/**
 * Toma, por (ejecucionId, municipioId), la fila con mayor id (la más
 * reciente) y suma los conteos por estatus dentro de cada ejecución.
 * Necesario porque los reintentos de envío crean filas nuevas en vez de
 * sobreescribir, así que un groupBy directo por estatus duplicaría conteos.
 */
function agruparYContar(filas, mapaResumen, clave) {
  const ultimaPorEjecucionMunicipio = new Map();
  for (const f of filas) {
    ultimaPorEjecucionMunicipio.set(`${f.ejecucionId}:${f.municipioId}`, f);
  }
  for (const f of ultimaPorEjecucionMunicipio.values()) {
    const resumen = mapaResumen.get(f.ejecucionId);
    if (!resumen) continue;
    resumen[clave][f.estatus] = (resumen[clave][f.estatus] || 0) + 1;
  }
}

/**
 * GET /api/ejecuciones?mes=&anio=&estatus=&usuarioId=&pagina=&porPagina=
 * Listado paginado para el Panel de Historial. Devuelve solo conteos
 * agregados por ejecución (no el detalle de los 113 municipios).
 */
async function listarEjecuciones(req, res) {
  const pagina = Math.max(parseInt(req.query.pagina, 10) || 1, 1);
  const porPagina = Math.min(Math.max(parseInt(req.query.porPagina, 10) || 10, 1), 50);

  const where = {};
  if (req.query.mes) where.mes = parseInt(req.query.mes, 10);
  if (req.query.anio) where.anio = parseInt(req.query.anio, 10);
  if (req.query.usuarioId) where.usuarioId = parseInt(req.query.usuarioId, 10);
  if (req.query.estatus) where.estatus = req.query.estatus;

  try {
    const [total, ejecuciones] = await Promise.all([
      prisma.ejecucion.count({ where }),
      prisma.ejecucion.findMany({
        where,
        include: { usuario: { select: { id: true, nombre: true, usuario: true } } },
        orderBy: { fechaInicio: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
    ]);

    const idsPagina = ejecuciones.map((e) => e.id);

    const [filasDescarga, filasEnvio] = await Promise.all([
      idsPagina.length
        ? prisma.resultadoDescarga.findMany({
            where: { ejecucionId: { in: idsPagina } },
            select: { id: true, ejecucionId: true, municipioId: true, estatus: true },
            orderBy: { id: 'asc' },
          })
        : [],
      idsPagina.length
        ? prisma.resultadoEnvio.findMany({
            where: { ejecucionId: { in: idsPagina } },
            select: { id: true, ejecucionId: true, municipioId: true, estatus: true },
            orderBy: { id: 'asc' },
          })
        : [],
    ]);

    const resumenPorEjecucion = new Map(idsPagina.map((id) => [id, { descarga: {}, envio: {} }]));
    agruparYContar(filasDescarga, resumenPorEjecucion, 'descarga');
    agruparYContar(filasEnvio, resumenPorEjecucion, 'envio');

    const resultado = ejecuciones.map((e) => {
      const resumen = resumenPorEjecucion.get(e.id) || { descarga: {}, envio: {} };
      const tieneRevisionManual = (resumen.envio.requiere_revision_manual ?? 0) > 0;
      // Un estado agregado más útil para la columna "Estado" de la tabla:
      // una ejecución técnicamente 'completada' pero con revisiones
      // pendientes merece su propio color en el listado.
      const estadoResumen = tieneRevisionManual && e.estatus === 'completado'
        ? 'con_revision_pendiente'
        : e.estatus;

      return {
        id: e.id,
        mes: e.mes,
        anio: e.anio,
        estatus: e.estatus,
        estadoResumen,
        fechaInicio: e.fechaInicio,
        fechaFin: e.fechaFin,
        usuario: e.usuario,
        resumen,
      };
    });

    res.json({
      total,
      pagina,
      porPagina,
      totalPaginas: Math.ceil(total / porPagina),
      ejecuciones: resultado,
    });
  } catch (err) {
    console.error('Error al listar el historial de ejecuciones:', err.message);
    res.status(500).json({ error: 'No se pudo obtener el historial de ejecuciones.' });
  }
}

function dedupeUltimoPorMunicipio(filas) {
  const porMunicipio = new Map();
  for (const f of filas) porMunicipio.set(f.municipioId, f);
  return Array.from(porMunicipio.values());
}

function contarPorEstatus(filas) {
  return filas.reduce((acc, f) => {
    acc[f.estatus] = (acc[f.estatus] || 0) + 1;
    return acc;
  }, {});
}

/**
 * GET /api/ejecuciones/:id
 * Detalle completo, municipio por municipio, de una ejecución cerrada.
 * Es el mismo "shape" que construirEstadoDesdeBD() arma para una ejecución
 * en progreso reconstruida, salvo que aquí siempre es historia cerrada:
 * nunca hay socket en vivo que la reemplace.
 */
async function obtenerDetalleEjecucion(req, res) {
  const ejecucionId = parseInt(req.params.id, 10);
  if (!ejecucionId) {
    return res.status(400).json({ error: 'Id de ejecución inválido.' });
  }

  try {
    const ejecucion = await prisma.ejecucion.findUnique({
      where: { id: ejecucionId },
      include: {
        usuario: { select: { id: true, nombre: true, usuario: true } },
        resultadosDescarga: { include: { municipio: true }, orderBy: { id: 'asc' } },
        resultadosEnvio: { include: { municipio: true }, orderBy: { id: 'asc' } },
      },
    });

    if (!ejecucion) {
      return res.status(404).json({ error: 'No existe una ejecución con ese id.' });
    }

    const descargaPorMunicipio = new Map();
    for (const r of ejecucion.resultadosDescarga) {
      descargaPorMunicipio.set(r.municipioId, r);
    }

    // Última fila de envío por municipio = estado vigente (ver nota de
    // reintentos arriba). intentosRegistrados cuenta cuántas filas hay en
    // total para ese municipio (1 = sin reintentos).
    const envioPorMunicipio = new Map();
    const intentosPorMunicipio = new Map();
    for (const r of ejecucion.resultadosEnvio) {
      envioPorMunicipio.set(r.municipioId, r);
      intentosPorMunicipio.set(r.municipioId, (intentosPorMunicipio.get(r.municipioId) || 0) + 1);
    }

    const municipiosIds = new Set([
      ...descargaPorMunicipio.keys(),
      ...envioPorMunicipio.keys(),
    ]);

    const municipios = Array.from(municipiosIds)
      .map((municipioId) => {
        const descarga = descargaPorMunicipio.get(municipioId);
        const envio = envioPorMunicipio.get(municipioId);
        const municipioInfo = descarga?.municipio || envio?.municipio;
        return {
          municipioId,
          nombre: municipioInfo?.nombre,
          codigoBcgs: municipioInfo?.codigoBcgs,
          descarga: descarga
            ? { estatus: descarga.estatus, archivo: descarga.archivo, error: descarga.error }
            : null,
          envio: envio
            ? {
                estatus: envio.estatus,
                tipoError: envio.tipoError,
                intentosRegistrados: intentosPorMunicipio.get(municipioId),
              }
            : null,
        };
      })
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    const resumen = {
      descarga: contarPorEstatus(ejecucion.resultadosDescarga),
      envio: contarPorEstatus(dedupeUltimoPorMunicipio(ejecucion.resultadosEnvio)),
    };

    res.json({
      id: ejecucion.id,
      mes: ejecucion.mes,
      anio: ejecucion.anio,
      estatus: ejecucion.estatus,
      fechaInicio: ejecucion.fechaInicio,
      fechaFin: ejecucion.fechaFin,
      usuario: ejecucion.usuario,
      resumen,
      municipios,
    });
  } catch (err) {
    console.error('Error al obtener el detalle de la ejecución:', err.message);
    res.status(500).json({ error: 'No se pudo obtener el detalle de la ejecución.' });
  }
}

module.exports = { listarEjecuciones, obtenerDetalleEjecucion };