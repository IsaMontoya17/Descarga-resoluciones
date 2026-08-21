/*
  Warnings:

  - A unique constraint covering the columns `[token_seguimiento]` on the table `resultados_envio` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `token_seguimiento` to the `resultados_envio` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `resultados_envio` ADD COLUMN `token_seguimiento` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `resultados_envio_token_seguimiento_key` ON `resultados_envio`(`token_seguimiento`);
