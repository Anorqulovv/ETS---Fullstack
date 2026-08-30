import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexes1788067315876 implements MigrationInterface {
    name = 'AddPerformanceIndexes1788067315876'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "homework_assignments" DROP CONSTRAINT "fk_homework_assignments_created_by"`);
        await queryRunner.query(`ALTER TABLE "homework_assignments" DROP CONSTRAINT "fk_homework_assignments_group"`);
        await queryRunner.query(`ALTER TABLE "homework_submissions" DROP CONSTRAINT "fk_homework_submissions_student"`);
        await queryRunner.query(`ALTER TABLE "homework_submissions" DROP CONSTRAINT "fk_homework_submissions_assignment"`);
        await queryRunner.query(`DROP INDEX "public"."idx_homework_assignments_group"`);
        await queryRunner.query(`DROP INDEX "public"."idx_homework_submissions_assignment"`);
        await queryRunner.query(`DROP INDEX "public"."idx_homework_submissions_student"`);
        await queryRunner.query(`ALTER TABLE "homework_submissions" ADD "fileUrl" text`);
        await queryRunner.query(`ALTER TABLE "homework_submissions" ADD "fileKey" text`);
        await queryRunner.query(`ALTER TYPE "public"."points_logs_source_enum" RENAME TO "points_logs_source_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."points_logs_source_enum" AS ENUM('ATTENDANCE', 'TEST', 'HOMEWORK', 'MANUAL', 'SHOP')`);
        await queryRunner.query(`ALTER TABLE "points_logs" ALTER COLUMN "source" TYPE "public"."points_logs_source_enum" USING "source"::"text"::"public"."points_logs_source_enum"`);
        await queryRunner.query(`DROP TYPE "public"."points_logs_source_enum_old"`);
        await queryRunner.query(`ALTER TABLE "homework_assignments" ALTER COLUMN "createdById" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_120e1c6edcec4f8221f467c803" ON "attendance" ("studentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_c2dba4746a161b806f9c969ccc" ON "test_results" ("testId") `);
        await queryRunner.query(`CREATE INDEX "IDX_6aaef2f942d654b9e7c710a302" ON "test_results" ("studentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_6fea943b3b432a9e3e38d53c31" ON "students" ("parentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_cc296de36cadf8de53b9cd60aa" ON "students" ("groupId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e63173ac43b478c2fc0cc20ac3" ON "groups" ("teacherId") `);
        await queryRunner.query(`CREATE INDEX "IDX_3d802bbcffd407a85b6e5a6075" ON "groups" ("branchId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ace513fa30d485cfd25c11a9e4" ON "users" ("role") `);
        await queryRunner.query(`CREATE INDEX "IDX_246426dfd001466a1d5e47322f" ON "users" ("branchId") `);
        await queryRunner.query(`CREATE INDEX "IDX_5618ade060df353e3965b75999" ON "user_activities" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_a4cfefb77be6e691c09b4f942f" ON "points_logs" ("studentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_b2731e10aef7f886a08c552290" ON "payments" ("studentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_6b6fd86acbb2e2987ad8237b88" ON "notifications" ("recipientId", "isRead") `);
        await queryRunner.query(`CREATE INDEX "IDX_2850e137c7fd27a745f6f6857c" ON "homework_submissions" ("assignmentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_53f3c5d0a99b4ce88b75efd1cd" ON "homework_submissions" ("studentId") `);
        await queryRunner.query(`ALTER TABLE "homework_assignments" ADD CONSTRAINT "FK_34acf46a93b59b41a88622ece7a" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "homework_assignments" ADD CONSTRAINT "FK_5a32a166f1382c1d1b7e97a50e6" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "homework_submissions" ADD CONSTRAINT "FK_2850e137c7fd27a745f6f6857cc" FOREIGN KEY ("assignmentId") REFERENCES "homework_assignments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "homework_submissions" ADD CONSTRAINT "FK_53f3c5d0a99b4ce88b75efd1cd9" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "homework_submissions" DROP CONSTRAINT "FK_53f3c5d0a99b4ce88b75efd1cd9"`);
        await queryRunner.query(`ALTER TABLE "homework_submissions" DROP CONSTRAINT "FK_2850e137c7fd27a745f6f6857cc"`);
        await queryRunner.query(`ALTER TABLE "homework_assignments" DROP CONSTRAINT "FK_5a32a166f1382c1d1b7e97a50e6"`);
        await queryRunner.query(`ALTER TABLE "homework_assignments" DROP CONSTRAINT "FK_34acf46a93b59b41a88622ece7a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_53f3c5d0a99b4ce88b75efd1cd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2850e137c7fd27a745f6f6857c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6b6fd86acbb2e2987ad8237b88"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b2731e10aef7f886a08c552290"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a4cfefb77be6e691c09b4f942f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5618ade060df353e3965b75999"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_246426dfd001466a1d5e47322f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ace513fa30d485cfd25c11a9e4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3d802bbcffd407a85b6e5a6075"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e63173ac43b478c2fc0cc20ac3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cc296de36cadf8de53b9cd60aa"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6fea943b3b432a9e3e38d53c31"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6aaef2f942d654b9e7c710a302"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c2dba4746a161b806f9c969ccc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_120e1c6edcec4f8221f467c803"`);
        await queryRunner.query(`ALTER TABLE "homework_assignments" ALTER COLUMN "createdById" DROP NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."points_logs_source_enum_old" AS ENUM('ATTENDANCE', 'TEST', 'MANUAL', 'SHOP')`);
        await queryRunner.query(`ALTER TABLE "points_logs" ALTER COLUMN "source" TYPE "public"."points_logs_source_enum_old" USING "source"::"text"::"public"."points_logs_source_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."points_logs_source_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."points_logs_source_enum_old" RENAME TO "points_logs_source_enum"`);
        await queryRunner.query(`ALTER TABLE "homework_submissions" DROP COLUMN "fileKey"`);
        await queryRunner.query(`ALTER TABLE "homework_submissions" DROP COLUMN "fileUrl"`);
        await queryRunner.query(`CREATE INDEX "idx_homework_submissions_student" ON "homework_submissions" ("studentId") `);
        await queryRunner.query(`CREATE INDEX "idx_homework_submissions_assignment" ON "homework_submissions" ("assignmentId") `);
        await queryRunner.query(`CREATE INDEX "idx_homework_assignments_group" ON "homework_assignments" ("groupId") `);
        await queryRunner.query(`ALTER TABLE "homework_submissions" ADD CONSTRAINT "fk_homework_submissions_assignment" FOREIGN KEY ("assignmentId") REFERENCES "homework_assignments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "homework_submissions" ADD CONSTRAINT "fk_homework_submissions_student" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "homework_assignments" ADD CONSTRAINT "fk_homework_assignments_group" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "homework_assignments" ADD CONSTRAINT "fk_homework_assignments_created_by" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
