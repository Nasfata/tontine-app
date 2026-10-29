-- CreateTable
CREATE TABLE `Role` (
    `code` VARCHAR(20) NOT NULL,
    `libelle` VARCHAR(50) NOT NULL,
    `niveau` INTEGER NOT NULL,

    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Utilisateur` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(100) NOT NULL,
    `telephone` VARCHAR(20) NOT NULL,
    `mot_de_passe_hash` VARCHAR(255) NOT NULL,
    `photo` VARCHAR(255) NULL,
    `date_creation` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `Utilisateur_telephone_key`(`telephone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tontine` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(100) NOT NULL,
    `montant_cotisation` DECIMAL(12, 2) NOT NULL,
    `frequence` ENUM('quotidien', 'hebdomadaire', 'mensuel') NOT NULL,
    `nombre_membres` INTEGER NOT NULL,
    `statut` VARCHAR(20) NOT NULL DEFAULT 'en_preparation',
    `date_debut` DATE NULL,
    `regles` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Participation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `utilisateur_id` INTEGER NOT NULL,
    `tontine_id` INTEGER NOT NULL,
    `role_code` VARCHAR(20) NOT NULL DEFAULT 'membre',
    `ordre_passage` INTEGER NULL,
    `date_adhesion` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `Participation_utilisateur_id_tontine_id_key`(`utilisateur_id`, `tontine_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tour` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tontine_id` INTEGER NOT NULL,
    `beneficiaire_id` INTEGER NULL,
    `numero` INTEGER NOT NULL,
    `date_prevue` DATE NOT NULL,
    `montant_cagnotte` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `statut` VARCHAR(20) NOT NULL DEFAULT 'a_venir',
    `date_remise` DATE NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cotisation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `participation_id` INTEGER NOT NULL,
    `tour_id` INTEGER NOT NULL,
    `montant` DECIMAL(12, 2) NOT NULL,
    `date_echeance` DATE NOT NULL,
    `date_paiement` DATE NULL,
    `statut` VARCHAR(20) NOT NULL DEFAULT 'non_paye',
    `preuve_url` VARCHAR(255) NULL,
    `note_refus` TEXT NULL,
    `validee_par` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Participation` ADD CONSTRAINT `Participation_utilisateur_id_fkey` FOREIGN KEY (`utilisateur_id`) REFERENCES `Utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Participation` ADD CONSTRAINT `Participation_tontine_id_fkey` FOREIGN KEY (`tontine_id`) REFERENCES `Tontine`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Participation` ADD CONSTRAINT `Participation_role_code_fkey` FOREIGN KEY (`role_code`) REFERENCES `Role`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tour` ADD CONSTRAINT `Tour_tontine_id_fkey` FOREIGN KEY (`tontine_id`) REFERENCES `Tontine`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tour` ADD CONSTRAINT `Tour_beneficiaire_id_fkey` FOREIGN KEY (`beneficiaire_id`) REFERENCES `Participation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cotisation` ADD CONSTRAINT `Cotisation_participation_id_fkey` FOREIGN KEY (`participation_id`) REFERENCES `Participation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cotisation` ADD CONSTRAINT `Cotisation_validee_par_fkey` FOREIGN KEY (`validee_par`) REFERENCES `Participation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cotisation` ADD CONSTRAINT `Cotisation_tour_id_fkey` FOREIGN KEY (`tour_id`) REFERENCES `Tour`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
