CREATE TABLE `NewsletterSubscriber` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING', 'ACTIVE', 'UNSUBSCRIBED') NOT NULL DEFAULT 'PENDING',
  `consentSource` VARCHAR(40) NOT NULL,
  `consentAt` DATETIME(3) NULL,
  `confirmedAt` DATETIME(3) NULL,
  `confirmationTokenHash` VARCHAR(64) NULL,
  `confirmationExpiresAt` DATETIME(3) NULL,
  `confirmationSentAt` DATETIME(3) NULL,
  `unsubscribedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `NewsletterSubscriber_email_key`(`email`),
  UNIQUE INDEX `NewsletterSubscriber_confirmationTokenHash_key`(`confirmationTokenHash`),
  INDEX `NewsletterSubscriber_status_createdAt_idx`(`status`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `NewsletterCampaign` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `subject` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `status` ENUM('DRAFT', 'QUEUED', 'SENDING', 'COMPLETED') NOT NULL DEFAULT 'DRAFT',
  `mode` ENUM('ALL', 'SELECTED') NULL,
  `queuedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `NewsletterCampaign_status_createdAt_idx`(`status`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `NewsletterDelivery` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `campaignId` INTEGER NOT NULL,
  `subscriberId` INTEGER NULL,
  `email` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
  `error` VARCHAR(1000) NULL,
  `providerMessageId` VARCHAR(255) NULL,
  `claimedAt` DATETIME(3) NULL,
  `sentAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `NewsletterDelivery_campaignId_email_key`(`campaignId`, `email`),
  INDEX `NewsletterDelivery_status_id_idx`(`status`, `id`),
  INDEX `NewsletterDelivery_subscriberId_idx`(`subscriberId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `NewsletterDelivery`
  ADD CONSTRAINT `NewsletterDelivery_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `NewsletterCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `NewsletterDelivery_subscriberId_fkey` FOREIGN KEY (`subscriberId`) REFERENCES `NewsletterSubscriber`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
