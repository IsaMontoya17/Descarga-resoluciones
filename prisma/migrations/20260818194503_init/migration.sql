-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `usuario` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `rol` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `usuarios_usuario_key`(`usuario`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ejecuciones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mes` INTEGER NOT NULL,
    `anio` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `estatus` VARCHAR(191) NOT NULL DEFAULT 'en_progreso',
    `fecha_inicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_fin` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `municipios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo_bcgs` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `municipios_codigo_bcgs_key`(`codigo_bcgs`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resultados_descarga` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ejecucion_id` INTEGER NOT NULL,
    `municipio_id` INTEGER NOT NULL,
    `estatus` VARCHAR(191) NOT NULL,
    `archivo` VARCHAR(191) NULL,
    `error` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resultados_envio` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ejecucion_id` INTEGER NOT NULL,
    `municipio_id` INTEGER NOT NULL,
    `estatus` VARCHAR(191) NOT NULL,
    `tipo_error` VARCHAR(191) NULL,
    `intentos` INTEGER NULL,
    `abierto` BOOLEAN NOT NULL DEFAULT false,
    `fecha_apertura` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `correos_municipio` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `municipio_id` INTEGER NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ejecuciones` ADD CONSTRAINT `ejecuciones_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resultados_descarga` ADD CONSTRAINT `resultados_descarga_ejecucion_id_fkey` FOREIGN KEY (`ejecucion_id`) REFERENCES `ejecuciones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resultados_descarga` ADD CONSTRAINT `resultados_descarga_municipio_id_fkey` FOREIGN KEY (`municipio_id`) REFERENCES `municipios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resultados_envio` ADD CONSTRAINT `resultados_envio_ejecucion_id_fkey` FOREIGN KEY (`ejecucion_id`) REFERENCES `ejecuciones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resultados_envio` ADD CONSTRAINT `resultados_envio_municipio_id_fkey` FOREIGN KEY (`municipio_id`) REFERENCES `municipios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `correos_municipio` ADD CONSTRAINT `correos_municipio_municipio_id_fkey` FOREIGN KEY (`municipio_id`) REFERENCES `municipios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
