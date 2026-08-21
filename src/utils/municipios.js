async function obtenerOCrearMunicipio(prisma, codigoBcgs, nombre) {
  return prisma.municipio.upsert({
    where: { codigoBcgs },
    update: { nombre },
    create: { codigoBcgs, nombre },
  });
}

async function obtenerUsuarioAdmin(prisma) {
  const admin = await prisma.usuario.findUnique({ where: { usuario: 'admin' } });
  if (!admin) {
    throw new Error(
      'No se encontró el usuario "admin". Corre "npx prisma db seed" antes de ejecutar el proceso.'
    );
  }
  return admin;
}

module.exports = { obtenerOCrearMunicipio, obtenerUsuarioAdmin };