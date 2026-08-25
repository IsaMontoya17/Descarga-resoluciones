import { useState } from 'react';
import { iniciarDescarga } from '../api/client';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = [ANIO_ACTUAL - 1, ANIO_ACTUAL, ANIO_ACTUAL + 1];

function PanelEjecucion({ onEjecucionIniciada }) {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function manejarEjecutar() {
    setError('');
    setCargando(true);

    try {
      const { id } = await iniciarDescarga(mes, anio);
      onEjecucionIniciada(id, mes, anio);
    } catch (err) {
      setError(err.message);
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
        <h1 className="text-xl font-semibold text-slate-800 mb-1">
          Descarga y envío de resoluciones
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Selecciona el periodo que deseas procesar.
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mes
            </label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {MESES.map((nombre, i) => (
                <option key={nombre} value={i + 1}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Año
            </label>
            <select
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {ANIOS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={manejarEjecutar}
          disabled={cargando}
          className="w-full bg-slate-800 text-white rounded-md py-2 font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          {cargando ? 'Iniciando...' : 'Ejecutar'}
        </button>
      </div>
    </div>
  );
}

export default PanelEjecucion;