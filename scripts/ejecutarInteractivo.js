const readline = require('readline');
const { ejecutarDescargaResoluciones } = require('./descargarResoluciones');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function preguntar(texto) {
  return new Promise((resolve) => rl.question(texto, resolve));
}

async function main() {
  const mesTexto = await preguntar('¿Qué mes quieres descargar? (1-12): ');
  const anioTexto = await preguntar('¿Qué año? (ej. 2026): ');
  rl.close();

  const mes = parseInt(mesTexto, 10);
  const anio = parseInt(anioTexto, 10);

  if (!mes || mes < 1 || mes > 12 || !anio) {
    console.error('Mes o año inválido. Usa un número de mes entre 1 y 12, y un año como 2026.');
    process.exit(1);
  }

  console.log(`\nDescargando resoluciones de ${mes}/${anio}...\n`);

  const reporte = await ejecutarDescargaResoluciones(mes, anio, { headless: false });

  console.log('\n=== Resumen ===');
  console.log(`Descargas exitosas: ${reporte.exitosos.length}`);
  console.log(`Descargas fallidas: ${reporte.fallidos.length}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});