function normalizarTexto(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') 
    .trim()
    .toUpperCase();
}

function nombreMes(numeroMes) {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  return meses[numeroMes - 1];
}

module.exports = { normalizarTexto, nombreMes };
