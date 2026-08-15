import { BadRequestException, Injectable, NotFoundException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual, IsNull } from 'typeorm';

import { Test } from '../../databases/entities/test.entity';
import { TestResult } from '../../databases/entities/test-result.entity';
import { Student } from '../../databases/entities/student.entity';
import { Parent } from '../../databases/entities/parent.entity';
import { Question } from '../../databases/entities/question.entity';
import { CodingProblem } from '../../databases/entities/coding-problem.entity';
import { CodingSubmission } from '../../databases/entities/coding-submission.entity';

import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { AddScoreDto } from './dto/add-score.dto';
import { GenerateMonthlyTestsDto } from './dto/generate-monthly-tests.dto';
import { CreateBankQuestionDto } from './dto/create-bank-question.dto';
import { AiGenerateTestDto } from './dto/ai-generate-test.dto';
import { SubmitCodingProblemDto } from './dto/submit-coding-problem.dto';
import { envConfig } from '../../common/config';

import { TelegramService } from '../telegram/telegram.service';
import { succesRes } from '../../infrastructure/utils/succes-res';
import { ISucces } from '../../infrastructure/utils/succes-interface';
import { UserRole } from '../../common/enums/role.enum';
import { TestType } from '../../common/enums/test.enum';
import { TestStatus } from '../../common/enums/testStatus.enum';
import { ProblemDifficulty, CodingSubmissionStatus } from '../../common/enums/problem-difficulty.enum';
import { GamificationService } from '../gamification/gamification.service';

@Injectable()
export class TestsService implements OnModuleInit {
  constructor(
    @InjectRepository(Test) private testRepo: Repository<Test>,
    @InjectRepository(TestResult) private resultRepo: Repository<TestResult>,
    @InjectRepository(Student) private studentRepo: Repository<Student>,
    @InjectRepository(Parent) private parentRepo: Repository<Parent>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    @InjectRepository(CodingProblem) private problemRepo: Repository<CodingProblem>,
    @InjectRepository(CodingSubmission) private submissionRepo: Repository<CodingSubmission>,
    private readonly telegramService: TelegramService,
    private readonly gamificationService: GamificationService,
  ) { }

  onModuleInit() {
    // Har 30 sekundda vaqtga qarab test statuslarini yangilaydi.
    setInterval(() => {
      this.syncTimedTestStatuses().catch((err) =>
        console.error("syncTimedTestStatuses error:", err?.message ?? err),
      );
      // O'quvchi testni ochib qo'yib, hech qachon "Yakunlash" bosmagan bo'lsa ham,
      // vaqti tugagan urinishlarni avtomatik yopib, 0 ball bilan yakunlaydi.
      this.autoExpireStaleTestResults().catch((err) =>
        console.error("autoExpireStaleTestResults error:", err?.message ?? err),
      );
    }, 30_000);
  }

  /**
   * "Ishlamoqda" holatida abadiy qolib ketgan urinishlarni tozalaydi.
   *
   * Muammo: submitTest ichidagi TIME_EXPIRED tekshiruvi faqat o'quvchi
   * o'zi "Yakunlash"ni bossa ishlaydi. Agar o'quvchi vaqt tugaganidan
   * keyin sahifani shunchaki tashlab ketsa (yoki test/internet uzilib
   * qolsa), submitTest hech qachon chaqirilmaydi va natija (TestResult)
   * abadiy isCurrent=true, submittedAt=null holatida qolib, admin
   * panelida "Ishlamoqda" deb ko'rsatilaveradi — hatto testning umumiy
   * muddati allaqachon tugagan bo'lsa ham.
   *
   * Yechim: har 30 sekundda hali yakunlanmagan (submittedAt IS NULL)
   * barcha urinishlarni tekshiramiz va har biri uchun muddatini hisoblab
   * chiqamiz:
   *   - agar testda durationMinutes bo'lsa: startedAt + durationMinutes
   *   - aks holda, testning umumiy endsAt vaqti
   * Shu muddat allaqachon o'tgan bo'lsa, urinishni submitTest'dagi bilan
   * bir xil qoidada (score=0, forceScoreZero=true, violationReason=
   * "TIME_EXPIRED") yakunlangan deb belgilaymiz.
   */
  /**
   * Bitta test urinishi uchun "qachongacha ishlash mumkin" chegarasini hisoblaydi.
   *
   * Har doim bir xil qoida — oddiy urinish uchun ham, qayta ishlashga ruxsat
   * berilgan urinish uchun ham: testning umumiy tugash vaqti (`endsAt`)gacha.
   * `durationMinutes` faqat ma'lumot uchun (masalan "45 daqiqa" deb ko'rsatish),
   * timerga ta'sir qilmaydi. Shunday qilib 13:00-14:00 oynali testda soat 13:00 da
   * kirgan o'quvchi 1 soat, 13:30 da kirgan o'quvchi esa 30 daqiqa ishlaydi.
   *
   * Qayta ishlashga ruxsat berilganda ham xuddi shu qoida: agar `endsAt`
   * allaqachon o'tib ketgan bo'lsa (odatda shuning uchun ruxsat berilgan),
   * ustoz testni tahrirlab `endsAt`ni uzaytirishi kerak — aks holda o'quvchiga
   * vaqt qolmaydi.
   */
  private computeTestDeadline(test: Test, _startedAt: Date, _isRetry: boolean): Date | null {
    // Qayta ishlashga ruxsat berilgan urinish uchun ham, oddiy urinish uchun ham bir xil
    // qoida: testning umumiy tugash vaqti (endsAt) asos bo'ladi — o'quvchi qachon kirgan
    // bo'lsa, o'sha lahzadan endsAt'gacha ishlaydi. Agar ustoz "qayta ishlashga ruxsat
    // berish"ni bosayotgan paytda endsAt allaqachon o'tib ketgan bo'lsa, u testni
    // tahrirlab endsAt'ni ham uzaytirishi kerak — aks holda o'quvchiga vaqt qolmaydi.
    return this.parseDateTime(test.endsAt);
  }

  private async autoExpireStaleTestResults() {
    const now = new Date();

    const staleResults = await this.resultRepo.find({
      where: { isCurrent: true, submittedAt: IsNull() },
      relations: ['test'],
    });

    if (!staleResults.length) return;

    const toUpdate: TestResult[] = [];

    for (const result of staleResults) {
      const test = result.test;
      if (!test || !result.startedAt) continue;

      // Har bir urinish uchun deadline: oddiy urinishda testning umumiy tugash
      // vaqtigacha; qayta ishlashga ruxsat berilgan urinishda esa yangi boshlangan
      // vaqtdan + durationMinutes (yoki standart sifatida asl oyna uzunligi).
      // Batafsili computeTestDeadline izohida.
      const isRetryAttempt = (result.attempt ?? 1) > 1;
      const deadline = this.computeTestDeadline(test, new Date(result.startedAt), isRetryAttempt);

      // Muddat aniqlanmagan bo'lsa (davomiylik ham, endsAt ham yo'q, yoki
      // bu qayta ishlashga ruxsat berilgan urinish bo'lsa), avtomatik
      // yopish uchun asos yo'q — tegmaymiz.
      if (!deadline || deadline > now) continue;

      result.score = 0;
      result.forceScoreZero = true;
      result.violationReason = result.violationReason ?? 'TIME_EXPIRED';
      result.submittedAt = now;
      result.timeSpentSeconds = Math.max(
        0,
        Math.round((deadline.getTime() - new Date(result.startedAt).getTime()) / 1000),
      );

      toUpdate.push(result);
    }

    if (toUpdate.length) {
      await this.resultRepo.save(toUpdate);
    }
  }




  private parseDateTime(value?: Date | string | null): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private validateTestTimeRange(
    startsAt?: Date | string | null,
    endsAt?: Date | string | null,
    durationMinutes?: number | null,
  ) {
    const start = this.parseDateTime(startsAt);
    const end = this.parseDateTime(endsAt);

    if (start && end && end <= start) {
      throw new BadRequestException("Test tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak");
    }

    if (durationMinutes !== undefined && durationMinutes !== null) {
      if (Number(durationMinutes) <= 0) {
        throw new BadRequestException("Test davomiyligi 0 dan katta bo'lishi kerak");
      }

      if (start && end) {
        const totalWindowMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);

        if (Number(durationMinutes) > totalWindowMinutes) {
          throw new BadRequestException(
            `Test davomiyligi test oralig'idan katta bo'lishi mumkin emas. Maksimum: ${totalWindowMinutes} daqiqa`,
          );
        }
      }
    }
  }

  private async syncTimedTestStatuses() {
    const now = new Date();

    // Vaqti tugagan testlar: har qanday holatdan NOACTIVE bo'ladi
    await this.testRepo
      .createQueryBuilder()
      .update(Test)
      .set({ status: TestStatus.NOACTIVE })
      .where('"isDeleted" = false')
      .andWhere('"endsAt" IS NOT NULL')
      .andWhere('"endsAt" <= :now', { now })
      .andWhere('status != :noactive', { noactive: TestStatus.NOACTIVE })
      .execute();

    // Boshlangan, lekin hali tugamagan testlar: IN_PROGRESS -> ACTIVE
    await this.testRepo
      .createQueryBuilder()
      .update(Test)
      .set({ status: TestStatus.ACTIVE })
      .where('"isDeleted" = false')
      .andWhere('status = :inProgress', { inProgress: TestStatus.IN_PROGRESS })
      .andWhere('"startsAt" IS NOT NULL')
      .andWhere('"startsAt" <= :now', { now })
      .andWhere('("endsAt" IS NULL OR "endsAt" > :now)', { now })
      .execute();
  }

  private async syncTestStatusByTime(test: Test): Promise<Test> {
    const now = new Date();
    const start = this.parseDateTime(test.startsAt);
    const end = this.parseDateTime(test.endsAt);

    if (end && end <= now && test.status !== TestStatus.NOACTIVE) {
      test.status = TestStatus.NOACTIVE;
      await this.testRepo.update(test.id, { status: TestStatus.NOACTIVE });
      return test;
    }

    if (
      test.status === TestStatus.IN_PROGRESS &&
      start &&
      start <= now &&
      (!end || end > now)
    ) {
      test.status = TestStatus.ACTIVE;
      await this.testRepo.update(test.id, { status: TestStatus.ACTIVE });
      return test;
    }

    return test;
  }

  private ensureTestCanBeSubmitted(test: Test, options?: { isRetry?: boolean }) {
    const now = new Date();
    const start = this.parseDateTime(test.startsAt);
    const end = this.parseDateTime(test.endsAt);

    // Ustoz "qayta ishlashga ruxsat berish" orqali maxsus ruxsat bergan bo'lsa (ya'ni bu
    // o'quvchi uchun oldingi urinish(lar) mavjud — chunki bunday urinish faqat teacher
    // reset qilgandan keyingina yaratiladi), testning umumiy muddati/holati bu o'quvchini
    // endi bloklamasligi kerak. Aks holda "ruxsat berish" tugmasi hech qanday amal
    // qilmas edi — chunki muddati o'tgan test `syncTestStatusByTime` tomonidan avtomatik
    // NOACTIVE qilib qo'yiladi va hech kim (hatto ruxsat berilgan o'quvchi ham) qayta
    // kira olmas edi.
    if (options?.isRetry) return;

    if (test.status !== TestStatus.ACTIVE) {
      throw new ForbiddenException("Bu test faol emas");
    }

    if (start && now < start) {
      throw new ForbiddenException("Test hali boshlanmagan");
    }

    if (end && now > end) {
      throw new ForbiddenException("Test vaqti tugagan");
    }
  }


  async aiGenerateTest(dto: AiGenerateTestDto, currentUser?: any): Promise<ISucces> {
    if (!envConfig.AI.AI_TEST_GENERATION_ENABLED) {
      throw new ForbiddenException(
        'AI test generatsiya hozircha o‘chirilgan (.env faylida AI_TEST_GENERATION_ENABLED=true qiling va serverni qayta ishga tushiring)',
      );
    }

    if (!envConfig.AI.GEMINI_API_KEY) {
      throw new ForbiddenException(
        'GEMINI_API_KEY sozlanmagan (.env faylida GEMINI_API_KEY ni to‘ldiring va serverni qayta ishga tushiring)',
      );
    }

    if (currentUser?.role === UserRole.TEACHER && dto.groupId) {
      const teacherGroup = await this.testRepo.manager
        .getRepository('groups')
        .findOne({ where: { id: dto.groupId, teacherId: currentUser.id } });

      if (!teacherGroup) {
        throw new ForbiddenException("Siz faqat o'z guruhingiz uchun AI test yarata olasiz");
      }
    }

    const count = dto.count ?? 10;
    const difficulty = dto.difficulty ?? 'medium';

    const prompt = `
Sen ta'lim CRM uchun test tuzuvchi assistantsan.
Faqat valid JSON qaytar. Markdown ishlatma.

Mavzu: ${dto.topic}
Test turi: ${dto.type}
Dars raqami: ${dto.lessonNumber ?? 'berilmagan'}
Qiyinlik: ${difficulty}
Savollar soni: ${count}

JSON format:
{
  "title": "test nomi",
  "type": "${dto.type}",
  "questions": [
    {
      "text": "savol matni",
      "choices": [
        { "text": "variant A", "isCorrect": true },
        { "text": "variant B", "isCorrect": false },
        { "text": "variant C", "isCorrect": false },
        { "text": "variant D", "isCorrect": false }
      ]
    }
  ]
}

Talablar:
- Har savolda kamida 4 ta variant bo'lsin.
- Faqat 1 ta to'g'ri javob bo'lsin.
- Savollar o'zbek tilida bo'lsin.
- Javob JSONdan boshqa hech narsa bo'lmasin.
`;

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${envConfig.AI.GEMINI_MODEL}:generateContent?key=${envConfig.AI.GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new ForbiddenException(`AI xatolik: ${errText}`);
    }

    const aiData: any = await response.json();
    const rawText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new ForbiddenException('AI javob qaytarmadi');
    }

    let parsed: any;

    try {
      parsed = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new ForbiddenException('AI valid JSON qaytarmadi');
      parsed = JSON.parse(match[0]);
    }

    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

    const normalizedQuestions = questions
      .filter((q: any) => q?.text && Array.isArray(q?.choices))
      .map((q: any) => {
        const choices = q.choices
          .filter((c: any) => c?.text)
          .slice(0, 6)
          .map((c: any) => ({
            text: String(c.text),
            isCorrect: Boolean(c.isCorrect),
          }));

        const correctCount = choices.filter((c) => c.isCorrect).length;

        if (correctCount !== 1 && choices.length > 0) {
          choices.forEach((c, index) => {
            c.isCorrect = index === 0;
          });
        }

        return {
          text: String(q.text),
          choices,
        };
      });

    // Masalalar (coding problems) — butunlay ixtiyoriy. Ustoz problemCount bermasa,
    // AI hech qanday masala qo'shmaydi va savollar bilan aralashtirmaydi.
    let generatedProblems: any[] = [];

    if (dto.problemCount && dto.problemCount > 0) {
      generatedProblems = await this.generateCodingProblemsWithAI(dto);
    }

    return succesRes({
      title: parsed.title || `${dto.topic} testi`,
      type: dto.type,
      directionId: dto.directionId,
      groupId: dto.groupId,
      lessonNumber: dto.lessonNumber,
      minScore: 60,
      generatedBy: 'AI',
      questions: normalizedQuestions,
      problemCount: dto.problemCount ?? 0,
      problemDifficultyMix: dto.problemDifficultyMix ?? null,
      problems: generatedProblems,
    });
  }

  // Berilgan daraja taqsimoti (yoki avtomatik taqsimot) asosida masalalar ro'yxati tuziladi.
  private buildProblemDifficultyList(count: number, mix?: Record<string, number>): ProblemDifficulty[] {
    if (mix && Object.keys(mix).length > 0) {
      const list: ProblemDifficulty[] = [];
      for (const key of Object.keys(mix)) {
        const level = key.toUpperCase() as ProblemDifficulty;
        if (!Object.values(ProblemDifficulty).includes(level)) continue;
        for (let i = 0; i < Number(mix[key] || 0); i++) list.push(level);
      }
      if (list.length > 0) return list.slice(0, count);
    }

    // Avtomatik taqsimot: sodda -> o'rta -> chuqur ketma-ketligida, teng bo'lishga harakat qiladi
    const order = [ProblemDifficulty.SIMPLE, ProblemDifficulty.MEDIUM, ProblemDifficulty.DEEP];
    const list: ProblemDifficulty[] = [];
    for (let i = 0; i < count; i++) list.push(order[i % order.length]);
    return list;
  }

  private async generateCodingProblemsWithAI(dto: AiGenerateTestDto): Promise<any[]> {
    const count = dto.problemCount ?? 0;
    if (count <= 0) return [];

    const difficultyList = this.buildProblemDifficultyList(count, dto.problemDifficultyMix);

    const prompt = `
Sen dasturlash o'quv markazi uchun LeetCode uslubidagi masalalar tuzuvchi assistantsan.
Faqat valid JSON qaytar. Markdown ishlatma, izoh yozma.

Mavzu: ${dto.topic}
Dars raqami: ${dto.lessonNumber ?? 'berilmagan'}
Masalalar soni: ${count}
Har bir masalaning darajasi ketma-ket shu ro'yxatda berilgan (aynan shu tartibda va shu sonda masala yarat):
${JSON.stringify(difficultyList)}

Daraja tushunchalari (tekshiruv chuqurligini belgilaydi, lekin masala matnini ham shunga mos qiyinlikda yoz):
- SIMPLE: sodda, bitta tushuncha (masalan sikl yoki shart) yetarli bo'ladigan masala
- MEDIUM: bir nechta tushunchani birlashtiradigan, oddiy edge-case'lar bor masala
- DEEP: murakkab algoritmik fikrlash, murakkablik (time/space complexity) haqida o'ylashni talab qiladigan masala

JSON format:
{
  "problems": [
    {
      "title": "masala nomi",
      "difficulty": "SIMPLE|MEDIUM|DEEP",
      "description": "to'liq shart matni, kirish/chiqish formati bilan",
      "sampleInput": "namuna kirish",
      "sampleOutput": "namuna chiqish",
      "constraints": "cheklovlar (masalan: 1 <= n <= 10^5)",
      "starterCode": "function solve() {\\n  // yechim shu yerga\\n}",
      "referenceSolution": "to'g'ri ishlaydigan namunaviy yechim kodi"
    }
  ]
}

Talablar:
- Masala matnlari o'zbek tilida yozilsin (kod va o'zgaruvchi nomlari inglizcha bo'lishi mumkin).
- referenceSolution ALBATTA to'g'ri ishlaydigan, to'liq kod bo'lsin — bu keyinchalik AI tekshiruvida ishlatiladi va o'quvchiga hech qachon ko'rsatilmaydi.
- Javob faqat JSON bo'lsin, undan boshqa hech narsa yozma.
`;

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${envConfig.AI.GEMINI_MODEL}:generateContent?key=${envConfig.AI.GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, responseMimeType: 'application/json' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new ForbiddenException(`AI xatolik (masalalar): ${errText}`);
    }

    const aiData: any = await response.json();
    const rawText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new ForbiddenException('AI masalalar uchun javob qaytarmadi');

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new ForbiddenException('AI masalalar uchun valid JSON qaytarmadi');
      parsed = JSON.parse(match[0]);
    }

    const problems = Array.isArray(parsed.problems) ? parsed.problems : [];

    return problems
      .filter((p: any) => p?.title && p?.description)
      .slice(0, count)
      .map((p: any, index: number) => {
        const rawDifficulty = String(p.difficulty || '').toUpperCase();
        const difficulty = Object.values(ProblemDifficulty).includes(rawDifficulty as ProblemDifficulty)
          ? (rawDifficulty as ProblemDifficulty)
          : (difficultyList[index] ?? ProblemDifficulty.MEDIUM);

        return {
          title: String(p.title),
          description: String(p.description),
          difficulty,
          sampleInput: p.sampleInput ? String(p.sampleInput) : undefined,
          sampleOutput: p.sampleOutput ? String(p.sampleOutput) : undefined,
          constraints: p.constraints ? String(p.constraints) : undefined,
          starterCode: p.starterCode ? String(p.starterCode) : undefined,
          referenceSolution: p.referenceSolution ? String(p.referenceSolution) : undefined,
          generatedBy: 'AI',
        };
      });
  }


  async getParentChildrenAnalytics(currentUser: any): Promise<ISucces> {
    const parent = await this.parentRepo.findOne({
      where: { userId: currentUser.id },
      relations: ['students', 'students.user', 'students.group'],
    });

    if (!parent || !parent.students?.length) {
      return succesRes({
        children: [],
      });
    }

    const children: any[] = [];

    for (const student of parent.students) {
      const results = await this.resultRepo.find({
        where: { studentId: student.id },
        relations: ['test'],
        order: { createdAt: 'ASC' },
      });

      // Barcha urinishlar hisobga olinadi: isCurrent=false bo'lgan arxiv urinishlar ham.
      const scores = results.map((r) => Number(r.score));

      const averageScore = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

      const highestScore = scores.length ? Math.max(...scores) : 0;
      const lowestScore = scores.length ? Math.min(...scores) : 0;

      children.push({
        studentId: student.id,
        fullName: student.user?.fullName,
        groupName: student.group?.name,
        totalTests: results.length,
        averageScore,
        highestScore,
        lowestScore,
        tests: results.map((r, index) => ({
          id: r.id,
          testId: r.testId,
          label: `${r.test?.title || `Test ${index + 1}`} (${r.attempt}-urinish)`,
          score: r.score,
          type: r.test?.type,
          date: r.createdAt,
          attempt: r.attempt,
          isCurrent: r.isCurrent,
        })),
      });
    }

    return succesRes({ children });
  }

  async getStudentAnalytics(studentId: number, currentUser?: any): Promise<ISucces> {
    const student = await this.studentRepo.findOne({
      where: { id: studentId },
      relations: ['user', 'group'],
    });

    if (!student) {
      throw new NotFoundException("O'quvchi topilmadi");
    }

    if (currentUser?.role === UserRole.TEACHER) {
      const teacherGroup = await this.testRepo.manager
        .getRepository('groups')
        .findOne({ where: { id: student.groupId, teacherId: currentUser.id } });

      if (!teacherGroup) {
        throw new ForbiddenException("Siz faqat o'z guruhingiz o'quvchilarini ko'ra olasiz");
      }
    }

    const results = await this.resultRepo.find({
      where: { studentId },
      relations: ['test'],
      order: { createdAt: 'ASC' },
    });

    // Diagramma va umumiy statistika barcha urinishlar bo'yicha hisoblanadi.
    // isCurrent=false bo'lgan eski urinishlar ham tarixda qoladi va chartda ko'rinadi.
    const allAttempts = results;

    const scores = allAttempts.map((r) => Number(r.score));
    const averageScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    const highestScore = scores.length ? Math.max(...scores) : 0;
    const lowestScore = scores.length ? Math.min(...scores) : 0;

    const tests = allAttempts.map((r, index) => ({
      id: r.id,
      testId: r.testId,
      label: `${r.test?.title || `Test ${index + 1}`} (${r.attempt}-urinish)`,
      score: r.score,
      type: r.test?.type,
      date: r.createdAt,
      attempt: r.attempt,
      isCurrent: r.isCurrent,
    }));

    return succesRes({
      studentId: student.id,
      fullName: student.user?.fullName,
      groupId: student.groupId,
      groupName: student.group?.name,
      totalTests: allAttempts.length,
      averageScore,
      highestScore,
      lowestScore,
      tests,
    });
  }

  async createBankQuestion(dto: CreateBankQuestionDto): Promise<ISucces> {
    const question = this.questionRepo.create({
      text: dto.text,
      isBank: true,
      directionId: dto.directionId,
      lessonNumber: dto.lessonNumber,
      type: dto.type,
      choices: dto.choices,
    });

    const saved = await this.questionRepo.save(question);
    return succesRes(saved, 201);
  }

  async getBankQuestions(directionId?: number, lessonNumber?: number, type?: TestType): Promise<ISucces> {
    const where: any = { isBank: true };

    if (directionId) where.directionId = directionId;
    if (lessonNumber) where.lessonNumber = lessonNumber;
    if (type) where.type = type;

    const data = await this.questionRepo.find({
      where,
      relations: ['choices'],
      order: { lessonNumber: 'ASC', id: 'ASC' },
    });

    return succesRes(data);
  }

  private async getQuestionsForGeneratedTest(directionId: number, lesson: number, type: TestType) {
    let lessons: number[] = [lesson];

    if (type === TestType.WEEKLY) {
      lessons = [lesson - 2, lesson - 1, lesson];
    }

    if (type === TestType.MONTHLY) {
      lessons = Array.from({ length: 12 }, (_, index) => index + 1);
    }

    return this.questionRepo.find({
      where: {
        isBank: true,
        directionId,
        lessonNumber: In(lessons),
      },
      relations: ['choices'],
      order: { lessonNumber: 'ASC', id: 'ASC' },
    });
  }

  private cloneBankQuestions(bankQuestions: Question[]) {
    return bankQuestions.map((question) => ({
      text: question.text,
      isBank: false,
      directionId: question.directionId,
      lessonNumber: question.lessonNumber,
      type: question.type,
      choices: question.choices?.map((choice) => ({
        text: choice.text,
        isCorrect: choice.isCorrect,
      })) ?? [],
    }));
  }

  async create(dto: CreateTestDto, currentUser?: any): Promise<ISucces> {
    this.validateTestTimeRange(dto.startsAt, dto.endsAt, dto.durationMinutes);

    if (!dto.groupId && !dto.directionId) {
      throw new BadRequestException("Umumiy test yaratib bo'lmaydi. Yo'nalish yoki guruh tanlang");
    }

    if (currentUser?.role === UserRole.TEACHER) {
      if (dto.groupId) {
        const teacherGroup = await this.testRepo.manager
          .getRepository('groups')
          .findOne({ where: { id: dto.groupId, teacherId: currentUser.id } });

        if (!teacherGroup) {
          throw new ForbiddenException("Siz faqat o'z guruhingizga test yarata olasiz");
        }
      }

      if (dto.directionId) {
        const teacher = await this.testRepo.manager
          .getRepository('users')
          .findOne({ where: { id: currentUser.id } });

        const teacherDirectionIds = [
          ...(teacher?.directionId ? [Number(teacher.directionId)] : []),
          ...((teacher?.directionIds ?? []) as any[]).map(Number),
        ];

        const uniqueDirectionIds = [...new Set(teacherDirectionIds)];

        if (!uniqueDirectionIds.includes(Number(dto.directionId))) {
          throw new ForbiddenException("Siz faqat o'zingizga biriktirilgan yo'nalishga test yarata olasiz");
        }
      }
    }

    const test = this.testRepo.create({
      ...dto,
      status: dto.status ?? TestStatus.ACTIVE,
      isDeleted: false,
      createdById: currentUser?.id,
    } as any);

    const saved = await this.testRepo.save(test);
    return succesRes(saved, 201);
  }


  async generateMonthlySchedule(dto: GenerateMonthlyTestsDto, currentUser?: any): Promise<ISucces> {
    const monthNumber = dto.monthNumber ?? 1;
    const minScore = dto.minScore ?? 60;
    const titlePrefix = dto.titlePrefix?.trim() || 'Test';

    // Teacher faqat o'z guruhiga test generate qila oladi
    if (currentUser?.role === UserRole.TEACHER) {
      const teacherGroup = await this.testRepo.manager
        .getRepository('groups')
        .findOne({ where: { id: dto.groupId, teacherId: currentUser.id } });

      if (!teacherGroup) {
        throw new ForbiddenException("Siz faqat o'z guruhingizga test yarata olasiz");
      }
    }

    const createdTests: Test[] = [];

    for (let lesson = 1; lesson <= 12; lesson++) {
      // 12 ta kunlik test
      const dailyBankQuestions = await this.getQuestionsForGeneratedTest(dto.directionId, lesson, TestType.DAILY);

      createdTests.push(
        this.testRepo.create({
          title: `${titlePrefix} - ${lesson}-dars kunlik test`,
          type: TestType.DAILY,
          groupId: dto.groupId,
          directionId: dto.directionId,
          lessonNumber: lesson,
          monthNumber,
          minScore,
          createdById: currentUser?.id,
          questions: this.cloneBankQuestions(dailyBankQuestions) as any,
        }),
      );

      // Har 3 ta darsdan keyin haftalik test
      if (lesson % 3 === 0) {
        const week = lesson / 3;

        const weeklyBankQuestions = await this.getQuestionsForGeneratedTest(dto.directionId, lesson, TestType.WEEKLY);

        createdTests.push(
          this.testRepo.create({
            title: `${titlePrefix} - ${week}-haftalik test`,
            type: TestType.WEEKLY,
            groupId: dto.groupId,
            directionId: dto.directionId,
            lessonNumber: lesson,
            weekNumber: week,
            monthNumber,
            minScore,
            createdById: currentUser?.id,
            questions: this.cloneBankQuestions(weeklyBankQuestions) as any,
          }),
        );
      }

      // 12-dars kuni oylik test
      if (lesson === 12) {
        const monthlyBankQuestions = await this.getQuestionsForGeneratedTest(dto.directionId, 12, TestType.MONTHLY);

        createdTests.push(
          this.testRepo.create({
            title: `${titlePrefix} - oylik test`,
            type: TestType.MONTHLY,
            groupId: dto.groupId,
            directionId: dto.directionId,
            lessonNumber: 12,
            monthNumber,
            minScore,
            createdById: currentUser?.id,
            questions: this.cloneBankQuestions(monthlyBankQuestions) as any,
          }),
        );
      }
    }

    const saved = await this.testRepo.save(createdTests);

    return succesRes({
      message: '12 darslik test jadvali yaratildi',
      total: saved.length,
      daily: saved.filter((t) => t.type === TestType.DAILY).length,
      weekly: saved.filter((t) => t.type === TestType.WEEKLY).length,
      monthly: saved.filter((t) => t.type === TestType.MONTHLY).length,
      data: saved,
    }, 201);
  }

  private async attachQuestionsCount<T extends { id: number }>(tests: T[]): Promise<(T & { questionsCount: number })[]> {
    if (!tests.length) return tests as (T & { questionsCount: number })[];
    const rows = await this.questionRepo
      .createQueryBuilder('q')
      .select('q.testId', 'testId')
      .addSelect('COUNT(*)', 'count')
      .where('q.testId IN (:...ids)', { ids: tests.map((t) => t.id) })
      .groupBy('q.testId')
      .getRawMany();
    const countByTestId = new Map<number, number>(rows.map((r) => [Number(r.testId), Number(r.count)]));
    return tests.map((t) => ({ ...t, questionsCount: countByTestId.get(t.id) ?? 0 }));
  }

  async findAll(currentUser: any): Promise<ISucces> {
    await this.syncTimedTestStatuses();

    if (currentUser.role === UserRole.STUDENT) {
      const student = await this.studentRepo.findOne({
        where: { userId: currentUser.id },
        relations: ['group'],
      });

      if (!student) return succesRes([]);

      const conditions: any[] = [];
      if (student.groupId) conditions.push({ groupId: student.groupId, status: TestStatus.ACTIVE, isDeleted: false });
      if (student.group?.directionId) {
        conditions.push({ directionId: student.group.directionId, groupId: null, status: TestStatus.ACTIVE, isDeleted: false });
      }
      // Umumiy testlar studentga ko'rsatilmaydi

      const data = await this.testRepo.find({
        where: conditions,
        order: { id: 'DESC' },
        relations: ['direction', 'group'],
      });

      return succesRes(await this.attachQuestionsCount(data));
    }

    if ([UserRole.TEACHER, UserRole.SUPPORT].includes(currentUser.role)) {
      const whereGroup =
        currentUser.role === UserRole.TEACHER
          ? { teacherId: currentUser.id }
          : { supportId: currentUser.id };

      const userGroups = await this.testRepo.manager
        .getRepository('groups')
        .find({
          where: whereGroup,
          select: ['id', 'directionId'],
        });

      const groupIds = userGroups.map((g: any) => Number(g.id));
      const directionIds = userGroups
        .map((g: any) => Number(g.directionId))
        .filter(Boolean);

      const conditions: any[] = [];

      if (groupIds.length) {
        conditions.push({
          groupId: In(groupIds),
          isDeleted: false,
        });
      }

      if (directionIds.length) {
        conditions.push({
          directionId: In(directionIds),
          groupId: null,
          isDeleted: false,
        });
      }

      // Muhim: umumiy testlar support/teacher uchun ko'rsatilmaydi.
      if (!conditions.length) {
        return succesRes([]);
      }

      const data = await this.testRepo.find({
        where: conditions,
        order: { id: 'DESC' },
        relations: ['direction', 'group'],
      });

      return succesRes(await this.attachQuestionsCount(data));
    }

    const data = await this.testRepo.find({
      where: { isDeleted: false } as any,
      order: { id: 'DESC' },
      relations: ['direction', 'group'],
    });

    return succesRes(await this.attachQuestionsCount(data));
  }

  async findOne(id: number, currentUser?: any): Promise<ISucces> {
    const test = await this.testRepo.findOne({
      where: { id },
      relations: {
        questions: { choices: true },
        results: { student: { user: true } },
        direction: true,
        group: true,
        problems: true,
      },
      order: { questions: { id: 'ASC' } },
    });

    if (!test) throw new NotFoundException(`Test ID ${id} topilmadi`);

    await this.syncTestStatusByTime(test);

    if (currentUser?.role === UserRole.STUDENT) {
      const student = await this.studentRepo.findOne({
        where: { userId: currentUser.id },
        relations: ['group'],
      });

      if (!student) throw new NotFoundException("O'quvchi topilmadi");

      const isOwnGroupTest = student.groupId != null && test.groupId === student.groupId;
      const isDirectionTest =
        test.directionId != null &&
        test.groupId == null &&
        student.group?.directionId === test.directionId;
      const isGeneral = test.groupId == null && test.directionId == null;

      if (!isOwnGroupTest && !isDirectionTest && !isGeneral) {
        throw new ForbiddenException("Bu test sizning guruhingizga tegishli emas");
      }

      // O'quvchi faqat o'z natijalarini ko'radi — barcha urinishlar bilan.
      // Muhim: to'g'ri javob belgisi (isCorrect) o'quvchiga umuman yuborilmasligi kerak,
      // aks holda brauzer tarmoq so'rovidan javoblarni ko'rish mumkin bo'lib qoladi.
      const myResults = test.results?.filter(r => r.studentId === student.id) ?? [];
      const sanitizedQuestions = (test.questions ?? []).map((q) => ({
        ...q,
        choices: (q.choices ?? []).map(({ isCorrect, ...choice }) => choice),
      }));
      // referenceSolution AI tekshiruvida yordamchi — o'quvchiga hech qachon yuborilmaydi.
      const sanitizedProblems = (test.problems ?? []).map(({ referenceSolution, ...p }) => p);
      return succesRes({
        ...test,
        questions: sanitizedQuestions,
        problems: sanitizedProblems,
        results: myResults,
      });
    }

    // Ustoz/Admin: barcha o'quvchilarning barcha urinishlari
    return succesRes(test);
  }

  async update(id: number, dto: UpdateTestDto): Promise<ISucces> {
    const test = await this.testRepo.findOne({ where: { id } });
    if (!test) throw new NotFoundException(`Test ID ${id} topilmadi`);

    const nextStartsAt = dto.startsAt !== undefined ? dto.startsAt : test.startsAt;
    const nextEndsAt = dto.endsAt !== undefined ? dto.endsAt : test.endsAt;
    const nextDurationMinutes =
      dto.durationMinutes !== undefined ? dto.durationMinutes : test.durationMinutes;

    this.validateTestTimeRange(nextStartsAt, nextEndsAt, nextDurationMinutes);

    if (nextEndsAt && new Date(nextEndsAt as any) <= new Date()) {
      (dto as any).status = TestStatus.NOACTIVE;
    }

    // `questions`/`problems` are relations, not columns — Repository.update() below only
    // touches scalar columns and silently no-ops on relation properties, so they're handled
    // separately here (delete + recreate, mirroring the questions/choices cascade approach).
    const { questions, problems, ...scalarDto } = dto as UpdateTestDto & {
      questions?: any[];
      problems?: any[];
    };

    if (questions !== undefined) {
      await this.questionRepo.delete({ testId: id });
      if (questions.length > 0) {
        const newQuestions = questions.map((q) =>
          this.questionRepo.create({
            text: q.text,
            testId: id,
            choices: (q.choices ?? []).map((c: any) => ({ text: c.text, isCorrect: !!c.isCorrect })),
          }),
        );
        await this.questionRepo.save(newQuestions);
      }
    }

    if (problems !== undefined) {
      await this.problemRepo.delete({ testId: id });
      if (problems.length > 0) {
        const newProblems = problems.map((p) =>
          this.problemRepo.create({
            title: p.title,
            description: p.description,
            difficulty: p.difficulty ?? ProblemDifficulty.MEDIUM,
            starterCode: p.starterCode,
            sampleInput: p.sampleInput,
            sampleOutput: p.sampleOutput,
            constraints: p.constraints,
            referenceSolution: p.referenceSolution,
            testId: id,
            generatedBy: p.generatedBy ?? 'MANUAL',
          }),
        );
        await this.problemRepo.save(newProblems);
      }
    }

    if (Object.keys(scalarDto).length > 0) {
      await this.testRepo.update(id, scalarDto);
    }
    const updated = await this.testRepo.findOne({
      where: { id },
      relations: ['direction', 'group', 'questions', 'questions.choices', 'problems'],
    });

    return succesRes(updated!);
  }

  async remove(id: number, currentUser?: any): Promise<ISucces> {
    const test = await this.testRepo.findOne({ where: { id } });
    if (!test) throw new NotFoundException(`Test ID ${id} topilmadi`);

    if (currentUser?.role === UserRole.TEACHER) {
      if (!test.createdById || Number(test.createdById) !== Number(currentUser.id)) {
        throw new ForbiddenException("Siz faqat o'zingiz yaratgan testni o'chira olasiz");
      }
    }

    await this.testRepo.update(id, { isDeleted: true } as any);

    return succesRes({ message: "Test arxivlandi. Natijalar statistikada saqlanadi." });
  }

  // ==================== RESET (natijani arxivlab qayta ishlashga ruxsat) ====================
  async resetTestAttempt(currentUser: any, studentId: number, testId: number): Promise<ISucces> {
    const student = await this.studentRepo.findOne({
      where: { id: studentId },
      relations: ['group'],
    });
    if (!student) throw new NotFoundException("O'quvchi topilmadi");

    if (currentUser?.role === UserRole.TEACHER && student.groupId) {
      const teacherGroup = await this.testRepo.manager
        .getRepository('groups')
        .findOne({ where: { id: student.groupId, teacherId: currentUser.id } });

      if (!teacherGroup) {
        throw new ForbiddenException("Siz faqat o'z guruhingiz o'quvchilariga ruxsat bera olasiz");
      }
    }

    // Joriy faol natijani arxivlaymiz (o'chirmaymiz — tarix saqlanadi)
    const currentResult = await this.resultRepo.findOne({
      where: { testId, studentId, isCurrent: true },
    });

    if (!currentResult) {
      throw new NotFoundException("Bu o'quvchining bu test bo'yicha faol natijasi topilmadi");
    }

    // Urinishlar sonini hisoblaymiz
    const attemptCount = await this.resultRepo.count({ where: { testId, studentId } });

    // Eski natijani arxivlaymiz
    await this.resultRepo.update(currentResult.id, { isCurrent: false });

    return succesRes({
      message: `O'quvchi ID ${studentId} uchun test ID ${testId} natijasi arxivlandi. Endi ${attemptCount + 1}-urinish uchun ishlashi mumkin.`,
      archivedAttempt: attemptCount,
    });
  }

  // ==================== O'QUVCHI NATIJALAR TARIXI ====================

  async getStudentTestReview(testId: number, studentId: number, currentUser?: any): Promise<ISucces> {
    const student = await this.studentRepo.findOne({
      where: { id: studentId },
      relations: ['user', 'group'],
    });

    if (!student) {
      throw new NotFoundException("O'quvchi topilmadi");
    }

    if (currentUser?.role === UserRole.TEACHER) {
      const teacherGroup = await this.testRepo.manager
        .getRepository('groups')
        .findOne({ where: { id: student.groupId, teacherId: currentUser.id } });

      if (!teacherGroup) {
        throw new ForbiddenException("Siz faqat o'z guruhingiz o'quvchilarini ko'ra olasiz");
      }
    }

    const test = await this.testRepo.findOne({
      where: { id: testId },
      relations: {
        questions: { choices: true },
        group: true,
        direction: true,
      },
      order: { questions: { id: 'ASC' } },
    });

    if (!test) {
      throw new NotFoundException('Test topilmadi');
    }

    const results = await this.resultRepo.find({
      where: { testId, studentId },
      order: { attempt: 'ASC' },
    });

    // Masalalar (agar testga biriktirilgan bo'lsa) — har bir urinish (attempt) uchun
    // shu urinishga tegishli submission'lar bilan bog'lab beriladi.
    const problems = await this.problemRepo.find({ where: { testId }, order: { id: 'ASC' } });
    const problemIds = problems.map((p) => p.id);
    const submissions =
      problemIds.length > 0
        ? await this.submissionRepo.find({
            where: { studentId, problemId: In(problemIds) },
            order: { createdAt: 'ASC' },
          })
        : [];

    const attempts = results.map((result) => {
      const answerMap = (result.answers ?? {}) as Record<string, number>;

      const questionReviews = (test.questions ?? []).map((question) => {
        const selectedChoiceId = Number(answerMap[String(question.id)] ?? answerMap[question.id as any]);
        const selectedChoice = question.choices?.find((choice) => Number(choice.id) === selectedChoiceId) ?? null;
        const correctChoice = question.choices?.find((choice) => choice.isCorrect) ?? null;

        return {
          questionId: question.id,
          questionText: question.text,
          selectedChoiceId: selectedChoice?.id ?? null,
          selectedChoiceText: selectedChoice?.text ?? null,
          correctChoiceId: correctChoice?.id ?? null,
          correctChoiceText: correctChoice?.text ?? null,
          isCorrect: Boolean(selectedChoice && correctChoice && selectedChoice.id === correctChoice.id),
        };
      });

      return {
        resultId: result.id,
        score: result.score,
        attempt: result.attempt,
        isCurrent: result.isCurrent,
        createdAt: result.createdAt,
        questions: questionReviews,
        wrongQuestions: questionReviews.filter((q) => !q.isCorrect),
        // Masalalar — faqat shu urinish (testResultId) doirasida topshirilganlari
        problemsScore: result.problemsScore ?? null,
        problemsChecked: result.problemsChecked ?? false,
        problems: problems.map((problem) => {
          const submission = submissions.find(
            (s) => s.problemId === problem.id && s.testResultId === result.id,
          );
          return {
            problemId: problem.id,
            title: problem.title,
            difficulty: problem.difficulty,
            code: submission?.code ?? null,
            language: submission?.language ?? null,
            status: submission?.status ?? 'NOT_SUBMITTED',
            aiScore: submission?.aiScore ?? null,
            aiFeedback: submission?.aiFeedback ?? null,
          };
        }),
      };
    });

    return succesRes({
      testId,
      testTitle: test.title,
      studentId: student.id,
      studentName: student.user?.fullName,
      attempts,
    });
  }


  async getStudentTestHistory(studentId: number): Promise<ISucces> {
    const results = await this.resultRepo.find({
      where: { studentId },
      relations: ['test'],
      order: { createdAt: 'DESC' },
    });
    return succesRes(results);
  }

  async addScore(dto: AddScoreDto): Promise<ISucces> {
    const test = await this.testRepo.findOne({ where: { id: dto.testId } });
    if (!test) throw new NotFoundException('Test topilmadi');

    if (test.status && test.status !== TestStatus.ACTIVE) {
      throw new ForbiddenException('Bu test faol emas');
    }

    const student = await this.studentRepo.findOne({
      where: { id: dto.studentId },
      relations: ['user', 'parent', 'parent.user'],
    });

    if (!student) throw new NotFoundException("O'quvchi topilmadi");

    // Agar faol natija bo'lsa arxivlaymiz
    const existing = await this.resultRepo.findOne({
      where: { testId: dto.testId, studentId: dto.studentId, isCurrent: true },
    });
    const attemptCount = await this.resultRepo.count({ where: { testId: dto.testId, studentId: dto.studentId } });
    if (existing) {
      await this.resultRepo.update(existing.id, { isCurrent: false });
    }

    const result = this.resultRepo.create({
      testId: dto.testId,
      studentId: dto.studentId,
      score: dto.score,
      attempt: attemptCount + 1,
      isCurrent: true,
    });

    const savedResult = await this.resultRepo.save(result);

    const minScore = test.minScore ?? 60;
    const passed = dto.score >= minScore;

    if (student.user?.telegramId) {
      const msg =
        `📊 <b>Test natijasi</b>\n\n` +
        `📝 Test: <b>${test.title}</b>\n` +
        `🎯 Ballingiz: <b>${dto.score}</b>/100\n` +
        `📉 Min ball: ${minScore}\n` +
        `${passed ? "✅ O'tdingiz!" : "❌ O'tmadingiz"}`;

      await this.telegramService.sendNotification(student.user.telegramId, msg);
    }

    if (student.parent?.user?.telegramId) {
      const parentMsg =
        `📊 <b>Farzandingiz test ishladi</b>\n\n` +
        `👤 O'quvchi: <b>${student.user?.fullName}</b>\n` +
        `📝 Test: <b>${test.title}</b>\n` +
        `🎯 Ball: <b>${dto.score}</b>/100 (min: ${minScore})\n` +
        `🔢 Urinish: ${attemptCount + 1}-chi\n` +
        `${passed ? "✅ O'tdi" : "❌ O'tmadi"}\n\n` +
        `${passed ? "Tabriklaymiz!" : "Iltimos, farzandingiz bilan natijani muhokama qiling."}`;

      await this.telegramService.sendNotification(student.parent.user.telegramId, parentMsg);
    }

    return succesRes(savedResult);
  }


  async startTest(userId: number, testId: number): Promise<ISucces> {
    const student = await this.studentRepo.findOne({
      where: { userId },
      relations: ['user', 'group'],
    });

    if (!student) throw new NotFoundException("O'quvchi topilmadi");

    const test = await this.testRepo.findOne({
      where: { id: testId },
      relations: { questions: { choices: true } },
    });

    if (!test) throw new NotFoundException("Test topilmadi");

    await this.syncTestStatusByTime(test);

    // Oldin kamida bitta urinish (hatto tugallanmagan/topshirilmagan bo'lsa ham) mavjud
    // bo'lsa — bu "davom ettirish" (sahifa qayta yuklandi) yoki ustoz reset qilgandan
    // keyingi qayta urinish. Ikkala holatda ham testning umumiy muddati (endsAt)
    // o'quvchini bloklamasligi kerak.
    const previousAttemptsCount = await this.resultRepo.count({
      where: { testId, studentId: student.id },
    });
    this.ensureTestCanBeSubmitted(test, { isRetry: previousAttemptsCount > 0 });

    const isOwnGroupTest = student.groupId != null && test.groupId === student.groupId;
    const isDirectionTest =
      test.directionId != null &&
      test.groupId == null &&
      student.group?.directionId === test.directionId;

    if (!isOwnGroupTest && !isDirectionTest) {
      throw new ForbiddenException("Bu test sizning guruhingizga tegishli emas");
    }

    const existingCurrent = await this.resultRepo.findOne({
      where: { testId, studentId: student.id, isCurrent: true },
    });

    if (existingCurrent?.submittedAt) {
      if (existingCurrent.forceScoreZero) {
        throw new ForbiddenException("Bu test qoidabuzarlik sababli 0 ball bilan yakunlangan. Qayta ishlash uchun ustoz ruxsati kerak.");
      }

      throw new ForbiddenException("Siz bu testni allaqachon topshirgansiz. Qayta ishlash uchun ustoz ruxsati kerak.");
    }

    if (existingCurrent && !existingCurrent.submittedAt) {
      const deadline = this.computeTestDeadline(
        test,
        new Date(existingCurrent.startedAt),
        (existingCurrent.attempt ?? 1) > 1,
      );
      return succesRes({
        resultId: existingCurrent.id,
        testId,
        studentId: student.id,
        startedAt: existingCurrent.startedAt,
        durationMinutes: test.durationMinutes ?? null,
        serverNow: new Date().toISOString(),
        endsAt: test.endsAt ?? null,
        deadlineAt: deadline ? deadline.toISOString() : null,
      });
    }

    const attemptCount = previousAttemptsCount;

    const result = this.resultRepo.create({
      testId,
      studentId: student.id,
      score: 0,
      attempt: attemptCount + 1,
      isCurrent: true,
      startedAt: new Date(),
      answers: {},
    });

    const saved = await this.resultRepo.save(result);

    const deadline = this.computeTestDeadline(
      test,
      new Date(saved.startedAt),
      (saved.attempt ?? 1) > 1,
    );

    return succesRes({
      resultId: saved.id,
      testId,
      studentId: student.id,
      startedAt: saved.startedAt,
      durationMinutes: test.durationMinutes ?? null,
      serverNow: new Date().toISOString(),
      endsAt: test.endsAt ?? null,
      deadlineAt: deadline ? deadline.toISOString() : null,
    });
  }

  async markViolation(userId: number, testId: number, reason: string): Promise<ISucces> {
    const student = await this.studentRepo.findOne({
      where: { userId },
      relations: ['user', 'parent', 'parent.user'],
    });

    if (!student) throw new NotFoundException("O'quvchi topilmadi");

    const test = await this.testRepo.findOne({ where: { id: testId } });
    if (!test) throw new NotFoundException("Test topilmadi");

    let result = await this.resultRepo.findOne({
      where: { testId, studentId: student.id, isCurrent: true },
    });

    if (result?.submittedAt) {
      return succesRes({
        message: "Test allaqachon yakunlangan",
        score: result.score,
      });
    }

    if (!result) {
      const attemptCount = await this.resultRepo.count({
        where: { testId, studentId: student.id },
      });

      result = this.resultRepo.create({
        testId,
        studentId: student.id,
        score: 0,
        attempt: attemptCount + 1,
        isCurrent: true,
        startedAt: new Date(),
      });
    }

    result.score = 0;
    result.answers = {};
    result.forceScoreZero = true;
    result.violationReason = reason || "TEST_PAGE_LEFT";
    result.submittedAt = new Date();

    if (result.startedAt) {
      result.timeSpentSeconds = Math.max(
        0,
        Math.round((Date.now() - new Date(result.startedAt).getTime()) / 1000),
      );
    }

    const saved = await this.resultRepo.save(result);

    if (student.parent?.user?.telegramId) {
      await this.telegramService.sendNotification(
        student.parent.user.telegramId,
        `⚠️ <b>Test qoidasi buzildi</b>\n\n👤 O'quvchi: <b>${student.user?.fullName}</b>\n📝 Test: <b>${test.title}</b>\n🎯 Natija: <b>0/100</b>\nSabab: ${saved.violationReason}`,
      );
    }

    return succesRes({
      message: "Test qoidasi buzilgani uchun natija 0 qilindi",
      score: 0,
      reason: saved.violationReason,
    });
  }


  async submitTest(userId: number, testId: number, answers: Record<number, number>): Promise<ISucces> {
    const student = await this.studentRepo.findOne({
      where: { userId },
      relations: ['user', 'parent', 'parent.user', 'group'],
    });

    if (!student) throw new NotFoundException("O'quvchi topilmadi");

    const test = await this.testRepo.findOne({
      where: { id: testId },
      relations: { questions: { choices: true } },
    });

    if (!test) throw new NotFoundException('Test topilmadi');

    await this.syncTestStatusByTime(test);

    // Joriy urinish mavjudmi?
    let existingResult = await this.resultRepo.findOne({
      where: { testId, studentId: student.id, isCurrent: true },
    });

    // attempt > 1 — bu ustoz "qayta ishlashga ruxsat berish" orqali maxsus ruxsat bergan
    // urinish (xuddi startTest'dagi kabi) — testning umumiy muddati bu holatda
    // bloklamasligi kerak, aks holda "ruxsat berish" amalda ishlamay qolar edi.
    this.ensureTestCanBeSubmitted(test, { isRetry: (existingResult?.attempt ?? 1) > 1 });

    if (existingResult?.submittedAt) {
      throw new ForbiddenException(
        "Siz bu testni allaqachon topshirgansiz. Qayta ishlash uchun ustoz ruxsati kerak.",
      );
    }

    if (existingResult?.forceScoreZero) {
      throw new ForbiddenException("Bu test qoidabuzarlik sababli 0 ball bilan yakunlangan");
    }

    const isOwnGroupTest = student.groupId != null && test.groupId === student.groupId;
    const isDirectionTest =
      test.directionId != null &&
      test.groupId == null &&
      student.group?.directionId === test.directionId;
    const isGeneral = test.groupId == null && test.directionId == null;

    if (!isOwnGroupTest && !isDirectionTest && !isGeneral) {
      throw new ForbiddenException("Bu test sizning guruhingizga tegishli emas");
    }

    let correctCount = 0;
    const totalQuestions = test.questions.length;

    for (const question of test.questions) {
      const selectedChoiceId = answers[question.id];
      if (!selectedChoiceId) continue;

      const correctChoice = question.choices.find(c => c.isCorrect === true);
      if (correctChoice && correctChoice.id === selectedChoiceId) {
        correctCount++;
      }
    }

    // Masalalar (coding problems) — agar testga biriktirilgan bo'lsa, ular ham umumiy
    // ballga qo'shiladi. Har bir savol va har bir masala bittadan "birlik" sifatida
    // hisoblanadi (masala uchun AI bergan ball 0-100 -> 0-1 ulushga aylantiriladi).
    // Aks holda avval kuzatilgan xato: nazariy savollar 100% to'g'ri bo'lsa, masalalar
    // butunlay noto'g'ri yechilgan taqdirda ham umumiy ball 100 bo'lib chiqar edi.
    const problems = await this.problemRepo.find({ where: { testId } });
    let problemsScoreFraction = 0;
    let problemsAvgScore: number | null = null;
    let problemsCheckedCount = 0;

    if (problems.length > 0 && existingResult) {
      const submissions = await this.submissionRepo.find({
        where: {
          testResultId: existingResult.id,
          studentId: student.id,
          status: CodingSubmissionStatus.CHECKED,
        },
      });

      // Bir masala bir necha marta tekshirilgan bo'lishi mumkin — eng yaxshi natija olinadi.
      const bestByProblem = new Map<number, number>();
      for (const s of submissions) {
        const prev = bestByProblem.get(s.problemId);
        const current = s.aiScore ?? 0;
        if (prev === undefined || current > prev) bestByProblem.set(s.problemId, current);
      }

      for (const p of problems) {
        problemsScoreFraction += (bestByProblem.get(p.id) ?? 0) / 100;
      }

      problemsCheckedCount = bestByProblem.size;
      if (problemsCheckedCount > 0) {
        const total = Array.from(bestByProblem.values()).reduce((a, b) => a + b, 0);
        problemsAvgScore = Math.round(total / problemsCheckedCount);
      }
    }

    const totalItems = totalQuestions + problems.length;
    const correctItems = correctCount + problemsScoreFraction;
    const score = totalItems > 0 ? Math.round((correctItems / totalItems) * 100) : 0;
    const minScore = test.minScore ?? 60;
    const passed = score >= minScore;

    const previousAttempts = await this.resultRepo.count({
      where: { testId, studentId: student.id },
    });

    const startedAt = existingResult?.startedAt ?? new Date();

    const isRetryAttempt = (existingResult?.attempt ?? 1) > 1;
    const deadline = this.computeTestDeadline(test, new Date(startedAt), isRetryAttempt);

    if (deadline && new Date() > deadline) {
      const expiredResult = existingResult ?? this.resultRepo.create({
        testId,
        studentId: student.id,
        attempt: previousAttempts + 1,
        startedAt,
        isCurrent: true,
      });

      expiredResult.score = 0;
      expiredResult.answers = answers as any;
      expiredResult.forceScoreZero = true;
      expiredResult.violationReason = "TIME_EXPIRED";
      expiredResult.submittedAt = new Date();
      expiredResult.timeSpentSeconds = Math.max(
        0,
        Math.round((Date.now() - new Date(startedAt).getTime()) / 1000),
      );

      await this.resultRepo.save(expiredResult);

      return succesRes({
        testId,
        studentId: student.id,
        score: 0,
        passed: false,
        attempt: expiredResult.attempt,
        message: "Test vaqti tugagani uchun natija 0 qilindi.",
      });
    }

    const result = existingResult ?? this.resultRepo.create({
      testId,
      studentId: student.id,
      attempt: previousAttempts + 1,
      startedAt,
      isCurrent: true,
    });

    result.score = score;
    result.answers = answers as any;
    result.submittedAt = new Date();
    result.timeSpentSeconds = Math.max(
      0,
      Math.round((Date.now() - new Date(startedAt).getTime()) / 1000),
    );
    if (problems.length > 0) {
      result.problemsScore = problemsAvgScore;
      result.problemsChecked = problemsCheckedCount >= problems.length;
    }

    await this.resultRepo.save(result);
    void this.gamificationService.awardForTest(student.id, result.id, score, result.attempt);

    if (student.user?.telegramId) {
      const msg =
        `🧪 <b>Test natijasi</b>\n\n` +
        `📝 Test: <b>${test.title}</b>\n` +
        `🎯 Sizning ballingiz: <b>${score}</b>/100\n` +
        `📉 Minimal ball: ${minScore}\n` +
        `🔢 Urinish: ${result.attempt}-chi\n` +
        `${passed ? "✅ Tabriklaymiz! O'tdingiz 🎉" : "❌ Afsus, o'tmadingiz"}`;

      await this.telegramService.sendNotification(student.user.telegramId, msg);
    }

    if (student.parent?.user?.telegramId) {
      const parentMsg =
        `⚠️ <b>Hurmatli ota-ona!</b>\n\n` +
        `👤 O'quvchi: <b>${student.user?.fullName}</b>\n` +
        `📝 Test: <b>${test.title}</b>\n` +
        `🎯 Ball: <b>${score}</b>/100 (min: ${minScore})\n` +
        `🔢 Urinish: ${result.attempt}-chi\n` +
        `${passed ? "✅ O'tdi" : "❌ O'tmadi"}\n\n` +
        `Iltimos, farzandingiz bilan natijani muhokama qiling.`;

      await this.telegramService.sendNotification(student.parent.user.telegramId, parentMsg);
    }

    return succesRes({
      testId,
      studentId: student.id,
      score,
      passed,
      attempt: result.attempt,
      message: "Test muvaffaqiyatli topshirildi. Natijalar o'quvchi va ota-onaga yuborildi.",
    });
  }

  // ==================== CODING PROBLEMS (masalalar) ====================

  // O'quvchi uchun: testga biriktirilgan masalalar ro'yxati (referenceSolution yashiriladi)
  async getTestProblems(testId: number, currentUser: any): Promise<ISucces> {
    const problems = await this.problemRepo.find({
      where: { testId },
      order: { id: 'ASC' },
    });

    if (currentUser?.role === UserRole.STUDENT) {
      const sanitized = problems.map(({ referenceSolution, ...rest }) => rest);
      return succesRes(sanitized);
    }

    return succesRes(problems);
  }

  private buildProblemCheckPrompt(
    difficulty: ProblemDifficulty,
    problem: CodingProblem,
    code: string,
    language: string,
  ): string {
    const depthInstruction: Record<ProblemDifficulty, string> = {
      [ProblemDifficulty.SIMPLE]:
        "SODDA TEKSHIRISH: faqat kod berilgan masalani to'g'ri yechadimi-yo'qmi (natija to'g'riligi) tekshir. Batafsil tahlil qilma.",
      [ProblemDifficulty.MEDIUM]:
        "O'RTA TEKSHIRISH: natija to'g'riligini va asosiy edge case'larni (bo'sh kirish, chegaraviy qiymatlar) hisobga ol, kod tuzilishi haqida qisqa fikr bildir.",
      [ProblemDifficulty.DEEP]:
        "CHUQUR TEKSHIRISH: bir nechta test-case orqali natijani mental simulyatsiya qil, murakkablik (time/space complexity)ni bahola, kod sifati, xatoликлар va yaxshilash takliflarini keng yoz.",
    };

    return `
Sen dasturlash o'qituvchisan va o'quvchining kodini tekshiryapsan.
Faqat valid JSON qaytar. Markdown ishlatma.

Masala sarlavhasi: ${problem.title}
Masala sharti: ${problem.description}
Namuna kirish: ${problem.sampleInput ?? '-'}
Namuna chiqish: ${problem.sampleOutput ?? '-'}
Cheklovlar: ${problem.constraints ?? '-'}
Namunaviy to'g'ri yechim (faqat solishtirish uchun, o'quvchiga ko'rsatilmaydi): ${problem.referenceSolution ?? '-'}

O'quvchi kodi (${language}):
\`\`\`
${code}
\`\`\`

Tekshirish darajasi: ${difficulty}
${depthInstruction[difficulty]}

JSON format:
{
  "score": 0-100 oralig'idagi son,
  "verdict": "CORRECT" | "PARTIAL" | "INCORRECT",
  "summary": "qisqa umumiy xulosa (o'zbek tilida, 1-2 gap)",
  "strengths": ["kod ijobiy tomoni", "..."],
  "issues": ["aniqlangan xato yoki kamchilik", "..."],
  "complexity": "murakkablik haqida qisqa izoh (DEEP darajada to'liqroq, boshqalarida bo'sh qoldirish mumkin)"
}

Talablar:
- Baho faqat kod mantig'iga asoslansin, sintaksis xatolar bo'lsa score kamaytirilsin.
- Javob faqat JSON bo'lsin.
`;
  }

  private async checkCodingSubmissionWithAI(
    problem: CodingProblem,
    code: string,
    language: string,
  ): Promise<{ score: number; feedback: Record<string, any> }> {
    if (!envConfig.AI.GEMINI_API_KEY) {
      throw new ForbiddenException('GEMINI_API_KEY sozlanmagan');
    }

    const prompt = this.buildProblemCheckPrompt(problem.difficulty, problem, code, language);
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${envConfig.AI.GEMINI_MODEL}:generateContent?key=${envConfig.AI.GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new ForbiddenException(`AI tekshiruv xatoligi: ${errText}`);
    }

    const aiData: any = await response.json();
    const rawText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new ForbiddenException('AI tekshiruvdan javob qaytmadi');

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new ForbiddenException('AI tekshiruv valid JSON qaytarmadi');
      parsed = JSON.parse(match[0]);
    }

    const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));

    return {
      score,
      feedback: {
        verdict: parsed.verdict ?? (score >= 80 ? 'CORRECT' : score >= 40 ? 'PARTIAL' : 'INCORRECT'),
        summary: parsed.summary ?? '',
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        complexity: parsed.complexity ?? '',
      },
    };
  }

  // O'quvchi kodni yozib yuboradi -> AI daraja bo'yicha tekshiradi -> natija saqlanadi
  async submitCodingProblem(userId: number, dto: SubmitCodingProblemDto): Promise<ISucces> {
    const student = await this.studentRepo.findOne({ where: { userId } });
    if (!student) throw new NotFoundException("O'quvchi topilmadi");

    const problem = await this.problemRepo.findOne({ where: { id: dto.problemId } });
    if (!problem) throw new NotFoundException('Masala topilmadi');

    if (problem.testId !== dto.testId) {
      throw new BadRequestException('Masala ushbu testga tegishli emas');
    }

    const currentResult = await this.resultRepo.findOne({
      where: { testId: dto.testId, studentId: student.id, isCurrent: true },
    });

    // Test allaqachon yakunlangan (submittedAt bor) bo'lsa, masala qabul qilinmaydi —
    // aks holda umumiy ball (submitTest paytida hisoblanadi) bilan mos kelmay qolgan
    // "kechroq tekshirilgan" masalalar paydo bo'lishi mumkin edi.
    if (currentResult?.submittedAt) {
      throw new ForbiddenException(
        'Siz bu testni allaqachon topshirgansiz — masalalarni faqat test davomida yechish mumkin.',
      );
    }

    // Bir masala uchun AI bir marta tekshirgach, o'quvchi uni qayta o'zgartirib qayta
    // yubora olmaydi — aks holda "eng yaxshi urinish" tanlash orqali natijani manipulyatsiya
    // qilish mumkin bo'lardi.
    if (currentResult) {
      const alreadyChecked = await this.submissionRepo.findOne({
        where: {
          problemId: problem.id,
          studentId: student.id,
          testResultId: currentResult.id,
          status: CodingSubmissionStatus.CHECKED,
        },
      });
      if (alreadyChecked) {
        throw new ForbiddenException(
          'Siz bu masalani allaqachon AI bilan tekshirgansiz — uni qayta yechib bo\'lmaydi.',
        );
      }
    }

    const submission = this.submissionRepo.create({
      problemId: problem.id,
      studentId: student.id,
      testResultId: currentResult?.id,
      code: dto.code,
      language: dto.language ?? 'javascript',
      status: CodingSubmissionStatus.CHECKING,
    });
    const saved = await this.submissionRepo.save(submission);

    try {
      const { score, feedback } = await this.checkCodingSubmissionWithAI(
        problem,
        dto.code,
        dto.language ?? 'javascript',
      );

      saved.aiScore = score;
      saved.aiFeedback = feedback;
      saved.status = CodingSubmissionStatus.CHECKED;
      saved.checkedAt = new Date();
      await this.submissionRepo.save(saved);

      if (currentResult) {
        await this.recalculateProblemsScore(dto.testId, student.id, currentResult.id);
      }

      return succesRes({
        submissionId: saved.id,
        problemId: problem.id,
        score,
        feedback,
      });
    } catch (err) {
      saved.status = CodingSubmissionStatus.FAILED;
      await this.submissionRepo.save(saved);
      throw err;
    }
  }

  // Shu testResult (urinish) doirasida topshirilgan barcha masalalar bo'yicha o'rtacha ballni yangilaydi
  private async recalculateProblemsScore(testId: number, studentId: number, testResultId: number) {
    const problems = await this.problemRepo.find({ where: { testId } });
    if (problems.length === 0) return;

    const submissions = await this.submissionRepo.find({
      where: { testResultId, studentId, status: CodingSubmissionStatus.CHECKED },
    });

    if (submissions.length === 0) return;

    const total = submissions.reduce((sum, s) => sum + (s.aiScore ?? 0), 0);
    const problemsScore = Math.round(total / submissions.length);
    const problemsChecked = submissions.length >= problems.length;

    await this.resultRepo.update(testResultId, { problemsScore, problemsChecked });
  }

  // O'quvchining shu testdagi barcha masala natijalari (o'ziga)
  async getMyCodingResults(testId: number, userId: number): Promise<ISucces> {
    const student = await this.studentRepo.findOne({ where: { userId } });
    if (!student) throw new NotFoundException("O'quvchi topilmadi");

    const currentResult = await this.resultRepo.findOne({
      where: { testId, studentId: student.id, isCurrent: true },
    });

    const submissions = currentResult
      ? await this.submissionRepo.find({
          where: { studentId: student.id, testResultId: currentResult.id },
          order: { createdAt: 'ASC' },
        })
      : [];

    return succesRes({
      testResultId: currentResult?.id ?? null,
      problemsScore: currentResult?.problemsScore ?? null,
      problemsChecked: currentResult?.problemsChecked ?? false,
      submissions,
    });
  }

  // Ustoz/admin: bir o'quvchining testdagi masala yechimlarini ko'rish
  async getStudentProblemReview(testId: number, studentId: number, currentUser: any): Promise<ISucces> {
    if (currentUser?.role === UserRole.TEACHER) {
      const teacherGroup = await this.testRepo.manager
        .getRepository('groups')
        .findOne({ where: { teacherId: currentUser.id } });

      if (!teacherGroup) {
        throw new ForbiddenException("Sizga bu ma'lumotni ko'rish ruxsat etilmagan");
      }
    }

    const submissions = await this.submissionRepo.find({
      where: { studentId },
      relations: ['problem'],
      order: { createdAt: 'ASC' },
    });

    const filtered = submissions.filter((s) => s.problem?.testId === testId);

    return succesRes(filtered);
  }
}
