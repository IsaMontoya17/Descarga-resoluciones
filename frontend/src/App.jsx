import { useState } from 'react';
import Login from './pages/Login';
import PanelEjecucion from './pages/PanelEjecucion';
import PanelMonitoreo from './pages/PanelMonitoreo';

function App() {
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem('usuario');
    return guardado ? JSON.parse(guardado) : null;
  });
  const [ejecucionActual, setEjecucionActual] = useState(null);

  function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }

  function manejarEjecucionIniciada(id, mes, anio) {
    setEjecucionActual({ id, mes, anio });
  }

  if (!usuario) {
    return <Login onLoginExitoso={setUsuario} />;
  }

  return (
    <div>
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200">
        <span className="text-sm text-slate-600">
          {usuario.nombre} ({usuario.rol})
        </span>
        <button
          onClick={cerrarSesion}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          Cerrar sesión
        </button>
      </header>

      {ejecucionActual ? (
        <PanelMonitoreo
          ejecucionId={ejecucionActual.id}
          mes={ejecucionActual.mes}
          anio={ejecucionActual.anio}
        />
      ) : (
        <PanelEjecucion onEjecucionIniciada={manejarEjecucionIniciada} />
      )}
    </div>
  );
}

export default App;