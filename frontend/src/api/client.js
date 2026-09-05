const API_URL = import.meta.env.VITE_API_URL;

function obtenerToken() {
  return localStorage.getItem('token');
}

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

async function iniciarDescarga(mes, anio) {
  const res = await fetch(`${API_URL}/api/descargas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${obtenerToken()}`,
    },
    body: JSON.stringify({ mes, anio }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'No se pudo iniciar la descarga.');
  }

  return data;
}

async function obtenerPlantillaCorreo() {
  const res = await fetch(`${API_URL}/api/admin/plantilla`, {
    headers: { Authorization: `Bearer ${obtenerToken()}` },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'No se pudo obtener la plantilla de correo.');
  return data;
}

async function actualizarPlantillaCorreo(asunto, cuerpo) {
  const res = await fetch(`${API_URL}/api/admin/plantilla`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${obtenerToken()}`,
    },
    body: JSON.stringify({ asunto, cuerpo }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'No se pudo actualizar la plantilla de correo.');
  return data;
}

async function consultarEjecucion(id) {
  const res = await fetch(`${API_URL}/api/descargas/${id}`, {
    headers: { Authorization: `Bearer ${obtenerToken()}` },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'No se pudo consultar la ejecución.');
  }

  return data;
}

async function reintentarEnvio(id, codigos) {
  const res = await fetch(`${API_URL}/api/descargas/${id}/reintentar-envio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${obtenerToken()}`,
    },
    body: JSON.stringify({ codigos }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'No se pudo reintentar el envío.');
  return data;
}

async function listarMunicipiosAdmin() {
  const res = await fetch(`${API_URL}/api/admin/municipios`, {
    headers: { Authorization: `Bearer ${obtenerToken()}` },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'No se pudo obtener la lista de municipios.');
  return data;
}

async function actualizarCorreosMunicipio(id, correos) {
  const res = await fetch(`${API_URL}/api/admin/municipios/${id}/correos`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${obtenerToken()}`,
    },
    body: JSON.stringify({ correos }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'No se pudo actualizar los correos del municipio.');
  return data;
}

async function listarHistorialEjecuciones({ mes, anio, estatus, usuarioId, pagina, porPagina } = {}) {
  const params = new URLSearchParams();
  if (mes) params.set('mes', mes);
  if (anio) params.set('anio', anio);
  if (estatus) params.set('estatus', estatus);
  if (usuarioId) params.set('usuarioId', usuarioId);
  if (pagina) params.set('pagina', pagina);
  if (porPagina) params.set('porPagina', porPagina);

  const res = await fetch(`${API_URL}/api/ejecuciones?${params.toString()}`, {
    headers: { Authorization: `Bearer ${obtenerToken()}` },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'No se pudo obtener el historial de ejecuciones.');
  return data;
}

async function obtenerDetalleHistorialEjecucion(id) {
  const res = await fetch(`${API_URL}/api/ejecuciones/${id}`, {
    headers: { Authorization: `Bearer ${obtenerToken()}` },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'No se pudo obtener el detalle de la ejecución.');
  return data;
}

export {
  login,
  iniciarDescarga,
  consultarEjecucion,
  reintentarEnvio,
  listarMunicipiosAdmin,
  actualizarCorreosMunicipio,
  obtenerPlantillaCorreo,
  actualizarPlantillaCorreo,
  listarHistorialEjecuciones,
  obtenerDetalleHistorialEjecucion,
};