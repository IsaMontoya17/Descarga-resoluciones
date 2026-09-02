const path = require('path');
const prisma = require('../config/prisma');
const { cargarJSON } = require('../correo/correoBot');

// Migración de una sola vez: copia la plantilla que vivía en
// plantillaCorreo.json hacia la tabla plantilla_correo, para que quede
// editable desde el Panel de Administración (RF-25) en lugar de requerir
// editar el archivo a mano en el servidor.
async function migrarPlantilla() {
  const existente = await prisma.plantillaCorreo.findFirst();
  if (existente) {
    console.log('Ya existe una plantilla en la base de datos. No se hace nada.');
    return;
  }

  const rutaJson = path.resolve(__dirname, '../correo/plantillaCorreo.json');
  const plantilla = cargarJSON(rutaJson);

  if (!plantilla.asunto || !plantilla.cuerpo) {
    throw new Error('El archivo plantillaCorreo.json no tiene "asunto" y "cuerpo" válidos.');
  }

  await prisma.plantillaCorreo.create({
    data: { asunto: plantilla.asunto, cuerpo: plantilla.cuerpo },
  });

  console.log('✓ Plantilla migrada a la base de datos correctamente.');
}

migrarPlantilla()
  .catch((err) => {
    console.error('Error al migrar la plantilla:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());