import { useState } from 'react';
import Login from './pages/Login';

function App() {
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem('usuario');
    return guardado ? JSON.parse(guardado) : null;
  });

  if (!usuario) {
    return <Login onLoginExitoso={setUsuario} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-700">
        Sesión iniciada como <strong>{usuario.nombre}</strong> ({usuario.rol})
      </p>
    </div>
  );
}

export default App;