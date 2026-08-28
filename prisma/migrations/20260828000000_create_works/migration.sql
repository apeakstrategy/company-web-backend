CREATE TABLE `Work` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `slug` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL, `category` VARCHAR(100) NOT NULL,
  `shortDescription` VARCHAR(500) NOT NULL, `overview` TEXT NULL,
  `coverImageUrl` VARCHAR(2048) NOT NULL, `coverImagePublicId` VARCHAR(255) NULL,
  `coverImageAltText` VARCHAR(255) NULL, `client` VARCHAR(191) NULL,
  `timeline` VARCHAR(100) NULL, `teamSize` VARCHAR(100) NULL,
  `results` VARCHAR(500) NULL, `projectUrl` VARCHAR(2048) NULL,
  `completedAt` DATETIME(3) NULL, `isFeatured` BOOLEAN NOT NULL DEFAULT false,
  `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `sortOrder` INTEGER NOT NULL DEFAULT 0, `publishedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Work_slug_key`(`slug`), INDEX `Work_status_sortOrder_idx`(`status`, `sortOrder`),
  INDEX `Work_category_status_idx`(`category`, `status`),
  INDEX `Work_isFeatured_status_idx`(`isFeatured`, `status`), INDEX `Work_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WorkSection` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `workId` INTEGER NOT NULL,
  `heading` VARCHAR(191) NOT NULL, `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  INDEX `WorkSection_workId_sortOrder_idx`(`workId`, `sortOrder`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WorkParagraph` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `sectionId` INTEGER NOT NULL, `content` TEXT NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL, INDEX `WorkParagraph_sectionId_sortOrder_idx`(`sectionId`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WorkImage` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `workId` INTEGER NOT NULL, `sectionId` INTEGER NULL,
  `url` VARCHAR(2048) NOT NULL, `publicId` VARCHAR(255) NULL, `altText` VARCHAR(255) NOT NULL,
  `caption` VARCHAR(500) NULL, `width` INTEGER NULL, `height` INTEGER NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL, INDEX `WorkImage_workId_sortOrder_idx`(`workId`, `sortOrder`),
  INDEX `WorkImage_sectionId_sortOrder_idx`(`sectionId`, `sortOrder`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WorkTechnology` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `workId` INTEGER NOT NULL, `name` VARCHAR(100) NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0, INDEX `WorkTechnology_workId_sortOrder_idx`(`workId`, `sortOrder`),
  UNIQUE INDEX `WorkTechnology_workId_name_key`(`workId`, `name`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WorkService` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `workId` INTEGER NOT NULL, `name` VARCHAR(100) NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0, INDEX `WorkService_workId_sortOrder_idx`(`workId`, `sortOrder`),
  UNIQUE INDEX `WorkService_workId_name_key`(`workId`, `name`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkSection` ADD CONSTRAINT `WorkSection_workId_fkey` FOREIGN KEY (`workId`) REFERENCES `Work`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `WorkParagraph` ADD CONSTRAINT `WorkParagraph_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `WorkSection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `WorkImage` ADD CONSTRAINT `WorkImage_workId_fkey` FOREIGN KEY (`workId`) REFERENCES `Work`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `WorkImage` ADD CONSTRAINT `WorkImage_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `WorkSection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `WorkTechnology` ADD CONSTRAINT `WorkTechnology_workId_fkey` FOREIGN KEY (`workId`) REFERENCES `Work`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `WorkService` ADD CONSTRAINT `WorkService_workId_fkey` FOREIGN KEY (`workId`) REFERENCES `Work`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
