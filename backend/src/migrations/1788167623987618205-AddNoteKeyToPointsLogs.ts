import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNoteKeyToPointsLogs1788167623987618205 implements MigrationInterface {
  name = 'AddNoteKeyToPointsLogs1788167623987618205';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "points_logs" ADD "noteKey" character varying`);
    await queryRunner.query(`ALTER TABLE "points_logs" ADD "noteParams" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "points_logs" DROP COLUMN "noteParams"`);
    await queryRunner.query(`ALTER TABLE "points_logs" DROP COLUMN "noteKey"`);
  }
}
