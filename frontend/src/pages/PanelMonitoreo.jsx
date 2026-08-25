import { useEffect, useState, useRef } from 'react';
import socket from '../api/socket';
import { consultarEjecucion } from '../api/client';

function PanelMonitoreo({ ejecucionId, mes, anio }) {
  const [eventos, setEventos] = useState([]);
  const [estatus, setEstatus] = useState('en_progreso');
  const [reporte, setReporte] = useState(null);
  const finRef = useRef(null);

  useEffect(() => {
    // 1. Traer el estado actual (cubre el caso de recargar la página)
    consultarEjecucion(ejecucionId)
      .then((estado) => {
        setEventos(estado.eventos || []);
        setEstatus(estado.estatus);
        setReporte(estado.reporte);
      })
      .catch(() => {
        // Si falla la consulta inicial, seguimos igual con los eventos en vivo
      });

    // 2. Conectarse al socket y unirse a la sala de esta ejecución
    socket.connect();
    socket.emit('unirse_ejecucion', ejecucionId);

    function manejarProgreso(evento) {
      setEventos((prev) => [...prev, evento]);
    }

    function manejarEstadoFinal({ estatus, reporte, error }) {
      setEstatus(estatus);
      if (reporte) setReporte(reporte);
      if (error) setEventos((prev) => [...prev, { tipo: 'error_general', error }]);
    }

    socket.on('progreso', manejarProgreso);
    socket.on('estado_final', manejarEstadoFinal);

    return () => {
      socket.off('progreso', manejarProgreso);
      socket.off('estado_final', manejarEstadoFinal);
      socket.disconnect();
    };
  }, [ejecucionId]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [eventos]);

  const totalMunicipios = eventos.find((e) => e.tipo === 'municipios_encontrados')?.total;
  const exitosos = eventos.filter((e) => e.tipo === 'descarga_ok').length;
  const sinResoluciones = eventos.filter((e) => e.tipo === 'descarga_sin_datos').length;
  const fallidos = eventos.filter((e) => e.tipo === 'descarga_error').length;
  const procesados = exitosos + sinResoluciones + fallidos;
  const porcentaje = totalMunicipios ? Math.round((procesados / totalMunicipios) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-lg font-semibold text-slate-800 mb-1">
          Ejecución #{ejecucionId} — {mes}/{anio}
        </h1>
        <p className="text-sm text-slate-500 mb-4">
          Estado:{' '}
          <span
            className={
              estatus === 'completado'
                ? 'text-green-600 font-medium'
                : estatus === 'error'
                ? 'text-red-600 font-medium'
                : 'text-amber-600 font-medium'
            }
          >
            {estatus}
          </span>
        </p>

        {totalMunicipios && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-slate-600 mb-1">
              <span>{procesados} / {totalMunicipios} municipios</span>
              <span>{porcentaje}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5">
              <div
                className="bg-slate-800 h-2.5 rounded-full transition-all"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
            <div className="flex gap-4 mt-2 text-xs text-slate-500">
              <span>✔ Éxitos: {exitosos}</span>
              <span>— Sin movimiento: {sinResoluciones}</span>
              <span>✘ Fallos: {fallidos}</span>
            </div>
          </div>
        )}

        <div className="border border-slate-200 rounded-md h-64 overflow-y-auto p-3 text-xs font-mono text-slate-600 bg-slate-50">
          {eventos.map((e, i) => (
            <div key={i}>
              [{e.tipo}] {e.municipio || ''} {e.error ? `— ${e.error}` : ''}
            </div>
          ))}
          <div ref={finRef} />
        </div>

        {reporte && (
          <div className="mt-6 bg-slate-50 rounded-md p-4 text-sm text-slate-700">
            <p className="font-medium mb-2">Resumen final</p>
            <p>Descarga — exitosos: {reporte.descarga?.exitosos?.length ?? 0}, sin movimiento: {reporte.descarga?.sin_resoluciones?.length ?? 0}, fallidos: {reporte.descarga?.fallidos?.length ?? 0}</p>
            <p>Envío — exitosos: {reporte.envio?.exitosos?.length ?? 0}, requieren revisión: {reporte.envio?.requieren_revision_manual?.length ?? 0}, omitidos: {reporte.envio?.omitidos?.length ?? 0}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PanelMonitoreo;