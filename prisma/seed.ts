import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const claveHasheada = await bcrypt.hash('AdminCatastro2026*', 10);

  const admin = await prisma.usuario.upsert({
    where: { usuario: 'admin' },
    update: {},
    create: {
      nombre: 'Isabela Montoya Alarcón',
      usuario: 'admin',
      passwordHash: claveHasheada,
      rol: 'administrador',
    },
  });

  console.log(`✓ Usuario verificado/creado: ${admin.usuario}`);

  const rutaDestinatarios = path.resolve(__dirname, '../src/correo/destinatariosPrueba.json');

  if (fs.existsSync(rutaDestinatarios)) {
    const destinatariosData = JSON.parse(fs.readFileSync(rutaDestinatarios, 'utf-8'));

    for (const [codigo, data] of Object.entries<any>(destinatariosData)) {
      const municipio = await prisma.municipio.upsert({
        where: { codigoBcgs: codigo },
        update: { nombre: data.nombre },
        create: {
          codigoBcgs: codigo,
          nombre: data.nombre,
        },
      });

      await prisma.correoMunicipio.deleteMany({
        where: { municipioId: municipio.id },
      });

      for (const email of data.para || []) {
        await prisma.correoMunicipio.create({
          data: { municipioId: municipio.id, email, tipo: 'para' },
        });
      }

      for (const email of data.cc || []) {
        await prisma.correoMunicipio.create({
          data: { municipioId: municipio.id, email, tipo: 'cc' },
        });
      }

      for (const email of data.cco || []) {
        await prisma.correoMunicipio.create({
          data: { municipioId: municipio.id, email, tipo: 'cco' },
        });
      }
    }

    console.log('✓ Municipios y correos sembrados correctamente.');
  } else {
    console.warn(`! Archivo no encontrado en: ${rutaDestinatarios}`);
  }
}

main()
  .catch((e) => {
    console.error('Error al sembrar la base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });