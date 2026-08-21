const API_URL = import.meta.env.VITE_API_URL;

async function login(usuario, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Error al iniciar sesión.');
  }

  return data;
}

export { login };