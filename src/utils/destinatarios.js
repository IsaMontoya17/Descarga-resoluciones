async function obtenerDestinatarioMunicipio(prisma, codigoBcgs) {
  const municipio = await prisma.municipio.findUnique({
    where: { codigoBcgs },
    include: { correos: true },
  });

  if (!municipio) return null;

  const destinatario = { para: [], cc: [], cco: [] };
  for (const correo of municipio.correos) {
    if (destinatario[correo.tipo]) {
      destinatario[correo.tipo].push(correo.email);
    }
  }

  return destinatario;
}

module.exports = { obtenerDestinatarioMunicipio };