CREATE TABLE `Blog` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `slug` VARCHAR(191) NOT NULL, `title` VARCHAR(191) NOT NULL,
  `excerpt` VARCHAR(500) NOT NULL, `category` VARCHAR(100) NOT NULL, `coverImageUrl` VARCHAR(2048) NOT NULL,
  `coverImagePublicId` VARCHAR(255) NULL, `coverImageAltText` VARCHAR(255) NULL,
  `authorName` VARCHAR(120) NOT NULL DEFAULT 'A Peak Strategy Team', `authorRole` VARCHAR(120) NULL,
  `authorImageUrl` VARCHAR(2048) NULL, `authorImagePublicId` VARCHAR(255) NULL,
  `readTimeMinutes` INTEGER NOT NULL DEFAULT 5, `views` INTEGER NOT NULL DEFAULT 0,
  `isFeatured` BOOLEAN NOT NULL DEFAULT false, `status` ENUM('DRAFT','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `sortOrder` INTEGER NOT NULL DEFAULT 0, `seoTitle` VARCHAR(70) NULL, `seoDescription` VARCHAR(170) NULL,
  `canonicalUrl` VARCHAR(2048) NULL, `publishedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Blog_slug_key`(`slug`), INDEX `Blog_status_sortOrder_idx`(`status`,`sortOrder`),
  INDEX `Blog_category_status_idx`(`category`,`status`), INDEX `Blog_isFeatured_status_idx`(`isFeatured`,`status`),
  INDEX `Blog_publishedAt_idx`(`publishedAt`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `BlogSection` (`id` INTEGER NOT NULL AUTO_INCREMENT,`blogId` INTEGER NOT NULL,`heading` VARCHAR(191) NOT NULL,`sortOrder` INTEGER NOT NULL DEFAULT 0,`createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),`updatedAt` DATETIME(3) NOT NULL,INDEX `BlogSection_blogId_sortOrder_idx`(`blogId`,`sortOrder`),PRIMARY KEY (`id`)) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `BlogParagraph` (`id` INTEGER NOT NULL AUTO_INCREMENT,`sectionId` INTEGER NOT NULL,`content` TEXT NOT NULL,`sortOrder` INTEGER NOT NULL DEFAULT 0,`createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),`updatedAt` DATETIME(3) NOT NULL,INDEX `BlogParagraph_sectionId_sortOrder_idx`(`sectionId`,`sortOrder`),PRIMARY KEY (`id`)) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `BlogImage` (`id` INTEGER NOT NULL AUTO_INCREMENT,`blogId` INTEGER NOT NULL,`sectionId` INTEGER NULL,`url` VARCHAR(2048) NOT NULL,`publicId` VARCHAR(255) NULL,`altText` VARCHAR(255) NOT NULL,`caption` VARCHAR(500) NULL,`width` INTEGER NULL,`height` INTEGER NULL,`sortOrder` INTEGER NOT NULL DEFAULT 0,`createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),`updatedAt` DATETIME(3) NOT NULL,INDEX `BlogImage_blogId_sortOrder_idx`(`blogId`,`sortOrder`),INDEX `BlogImage_sectionId_sortOrder_idx`(`sectionId`,`sortOrder`),PRIMARY KEY (`id`)) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `BlogTag` (`id` INTEGER NOT NULL AUTO_INCREMENT,`name` VARCHAR(100) NOT NULL,`slug` VARCHAR(100) NOT NULL,`createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),UNIQUE INDEX `BlogTag_name_key`(`name`),UNIQUE INDEX `BlogTag_slug_key`(`slug`),PRIMARY KEY (`id`)) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `BlogTagAssignment` (`blogId` INTEGER NOT NULL,`tagId` INTEGER NOT NULL,`sortOrder` INTEGER NOT NULL DEFAULT 0,INDEX `BlogTagAssignment_blogId_sortOrder_idx`(`blogId`,`sortOrder`),INDEX `BlogTagAssignment_tagId_idx`(`tagId`),PRIMARY KEY (`blogId`,`tagId`)) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `BlogSection` ADD CONSTRAINT `BlogSection_blogId_fkey` FOREIGN KEY (`blogId`) REFERENCES `Blog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `BlogParagraph` ADD CONSTRAINT `BlogParagraph_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `BlogSection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `BlogImage` ADD CONSTRAINT `BlogImage_blogId_fkey` FOREIGN KEY (`blogId`) REFERENCES `Blog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `BlogImage` ADD CONSTRAINT `BlogImage_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `BlogSection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `BlogTagAssignment` ADD CONSTRAINT `BlogTagAssignment_blogId_fkey` FOREIGN KEY (`blogId`) REFERENCES `Blog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `BlogTagAssignment` ADD CONSTRAINT `BlogTagAssignment_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `BlogTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
