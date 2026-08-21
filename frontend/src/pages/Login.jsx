import { useState } from 'react';
import { login } from '../api/client';

function Login({ onLoginExitoso }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const data = await login(usuario, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      onLoginExitoso(data.usuario);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form
        onSubmit={manejarSubmit}
        className="bg-white rounded-lg shadow-md p-8 w-full max-w-sm"
      >
        <h1 className="text-xl font-semibold text-slate-800 mb-1">
          Gerencia de Catastro
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Gobernación de Antioquia — Descarga de resoluciones
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <label className="block text-sm font-medium text-slate-700 mb-1">
          Usuario
        </label>
        <input
          type="text"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          className="w-full border border-slate-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-slate-400"
          required
        />

        <label className="block text-sm font-medium text-slate-700 mb-1">
          Contraseña
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-slate-300 rounded-md px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-slate-400"
          required
        />

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-slate-800 text-white rounded-md py-2 font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          {cargando ? 'Ingresando...' : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  );
}

export default Login;