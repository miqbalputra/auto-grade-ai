CREATE TABLE `admin_users` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `last_login` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `admin_users_username_key`(`username`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `app_settings` (
  `id` INTEGER NOT NULL,
  `llm_base_url` VARCHAR(255) NULL,
  `llm_api_key` VARCHAR(500) NULL,
  `llm_model` VARCHAR(100) NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `students` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `latest_nis` VARCHAR(20) NULL,
  `name` VARCHAR(100) NOT NULL,
  `gender` ENUM('L', 'P') NULL,
  `final_score` DECIMAL(5, 2) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `students_name_idx`(`name`),
  INDEX `students_latest_nis_idx`(`latest_nis`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `report_cards` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `student_id` INTEGER NOT NULL,
  `nis_on_document` VARCHAR(20) NULL,
  `class_name` VARCHAR(50) NULL,
  `semester` INTEGER NOT NULL,
  `academic_year` VARCHAR(10) NOT NULL,
  `total_score` DECIMAL(7, 2) NOT NULL,
  `score_count` INTEGER NOT NULL,
  `average_score` DECIMAL(5, 2) NOT NULL,
  `score_breakdown` JSON NOT NULL,
  `file_url` VARCHAR(255) NULL,
  `status` ENUM('ok', 'needs_review', 'failed') NOT NULL DEFAULT 'ok',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `report_cards_student_id_semester_academic_year_key`(`student_id`, `semester`, `academic_year`),
  INDEX `report_cards_semester_academic_year_idx`(`semester`, `academic_year`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `report_cards`
  ADD CONSTRAINT `report_cards_student_id_fkey`
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
