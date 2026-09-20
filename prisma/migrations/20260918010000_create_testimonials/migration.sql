CREATE TABLE `Testimonial` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `clientName` VARCHAR(120) NOT NULL,
  `attribution` VARCHAR(160) NOT NULL,
  `quote` TEXT NOT NULL,
  `workId` INTEGER NULL,
  `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `consentConfirmed` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Testimonial_status_sortOrder_idx`(`status`, `sortOrder`),
  INDEX `Testimonial_workId_idx`(`workId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Testimonial`
  ADD CONSTRAINT `Testimonial_workId_fkey`
  FOREIGN KEY (`workId`) REFERENCES `Work`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
