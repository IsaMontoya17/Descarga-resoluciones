/*
  Warnings:

  - You are about to drop the column `abierto` on the `resultados_envio` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_apertura` on the `resultados_envio` table. All the data in the column will be lost.
  - You are about to drop the column `token_seguimiento` on the `resultados_envio` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `resultados_envio_token_seguimiento_key` ON `resultados_envio`;

-- AlterTable
ALTER TABLE `resultados_envio` DROP COLUMN `abierto`,
    DROP COLUMN `fecha_apertura`,
    DROP COLUMN `token_seguimiento`;
