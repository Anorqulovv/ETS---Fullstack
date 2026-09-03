import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudentGroups1788419382756779972 implements MigrationInterface {
  name = 'CreateStudentGroups1788419382756779972';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // DO bloklari orqali — agar oldingi urinishda type/table qisman yaratilgan bo'lsa ham,
    // migratsiya xavfsiz qayta ishlay oladi (idempotent).
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "student_groups_status_enum" AS ENUM ('ACTIVE', 'COMPLETED', 'LEFT');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "student_groups" (
        "id" SERIAL PRIMARY KEY,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "studentId" integer NOT NULL,
        "groupId" integer NOT NULL,
        "joinedAt" date,
        "leftAt" date,
        "status" "student_groups_status_enum" NOT NULL DEFAULT 'ACTIVE',
        CONSTRAINT "UQ_student_groups_student_group" UNIQUE ("studentId", "groupId"),
        CONSTRAINT "FK_student_groups_student" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_student_groups_group" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_student_groups_studentId" ON "student_groups" ("studentId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_student_groups_groupId" ON "student_groups" ("groupId")`);

    // Mavjud students.groupId ma'lumotlarini yangi jadvalga ko'chiramiz — takror yozuvlar
    // ON CONFLICT orqali xavfsiz o'tkazib yuboriladi.
    await queryRunner.query(`
      INSERT INTO "student_groups" ("studentId", "groupId", "joinedAt", "status")
      SELECT s."id", s."groupId", s."createdAt"::date, 'ACTIVE'
      FROM "students" s
      WHERE s."groupId" IS NOT NULL
      ON CONFLICT ("studentId", "groupId") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "student_groups"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "student_groups_status_enum"`);
  }
}
