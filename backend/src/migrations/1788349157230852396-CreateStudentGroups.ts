import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudentGroups1788349157230852396 implements MigrationInterface {
  name = 'CreateStudentGroups1788349157230852396';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "student_groups_status_enum" AS ENUM ('ACTIVE', 'COMPLETED', 'LEFT')
    `);

    await queryRunner.query(`
      CREATE TABLE "student_groups" (
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

    await queryRunner.query(`CREATE INDEX "IDX_student_groups_studentId" ON "student_groups" ("studentId")`);
    await queryRunner.query(`CREATE INDEX "IDX_student_groups_groupId" ON "student_groups" ("groupId")`);

    // Mavjud students.groupId ma'lumotlarini yangi jadvalga ko'chiramiz — hech narsa yo'qolmaydi.
    await queryRunner.query(`
      INSERT INTO "student_groups" ("studentId", "groupId", "joinedAt", "status")
      SELECT s."id", s."groupId", s."createdAt"::date, 'ACTIVE'
      FROM "students" s
      WHERE s."groupId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "student_groups"`);
    await queryRunner.query(`DROP TYPE "student_groups_status_enum"`);
  }
}
