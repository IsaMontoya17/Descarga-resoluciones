-- CreateTable
CREATE TABLE `plantilla_correo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asunto` TEXT NOT NULL,
    `cuerpo` TEXT NOT NULL,
    `actualizado_en` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
