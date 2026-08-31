import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillPointsLogsNoteKeys1788171090955115933 implements MigrationInterface {
  name = 'BackfillPointsLogsNoteKeys1788171090955115933';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ATTENDANCE — always the same fixed text.
    await queryRunner.query(`
      UPDATE points_logs
      SET "noteKey" = 'gamification.attendance'
      WHERE source = 'ATTENDANCE' AND note = 'Darsga qatnashgani uchun' AND "noteKey" IS NULL
    `);

    // HOMEWORK — always the same fixed text.
    await queryRunner.query(`
      UPDATE points_logs
      SET "noteKey" = 'gamification.homeworkGraded'
      WHERE source = 'HOMEWORK' AND note = 'Uyga vazifa baholandi' AND "noteKey" IS NULL
    `);

    // TEST — 1st attempt full score, no params needed.
    await queryRunner.query(`
      UPDATE points_logs
      SET "noteKey" = 'gamification.testFullScore'
      WHERE source = 'TEST' AND note = '1-urinish — to''liq ball' AND "noteKey" IS NULL
    `);

    // TEST — partial score: "{attempt}-urinish — {percent}%"
    await queryRunner.query(`
      UPDATE points_logs
      SET "noteKey" = 'gamification.testPartial',
          "noteParams" = jsonb_build_object(
            'attempt', (regexp_match(note, '^(\\d+)-urinish'))[1]::int,
            'percent', (regexp_match(note, '— (\\d+)%$'))[1]::int
          )
      WHERE source = 'TEST' AND note ~ '^\\d+-urinish — \\d+%$' AND "noteKey" IS NULL
    `);

    // TEST — no points: "{attempt}-urinish — ball berilmaydi"
    await queryRunner.query(`
      UPDATE points_logs
      SET "noteKey" = 'gamification.testNoPoints',
          "noteParams" = jsonb_build_object(
            'attempt', (regexp_match(note, '^(\\d+)-urinish'))[1]::int
          )
      WHERE source = 'TEST' AND note ~ '^\\d+-urinish — ball berilmaydi$' AND "noteKey" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort revert: clear noteKey/noteParams only for rows this migration would have set.
    await queryRunner.query(`
      UPDATE points_logs
      SET "noteKey" = NULL, "noteParams" = NULL
      WHERE source IN ('ATTENDANCE', 'HOMEWORK', 'TEST')
        AND "noteKey" IN (
          'gamification.attendance', 'gamification.homeworkGraded',
          'gamification.testFullScore', 'gamification.testPartial', 'gamification.testNoPoints'
        )
    `);
  }
}
