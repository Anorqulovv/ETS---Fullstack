import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Context, Markup, Telegraf } from 'telegraf';
import { sessionStore } from './session.store';
import { IsNull, Not, Repository } from 'typeorm';

import { User } from 'src/databases/entities/user.entity';
import { Student } from 'src/databases/entities/student.entity';
import { Parent } from 'src/databases/entities/parent.entity';
import { Group } from 'src/databases/entities/group.entity';
import { Attendance } from 'src/databases/entities/attendance.entity';
import { TestResult } from 'src/databases/entities/test-result.entity';
import { Test } from 'src/databases/entities/test.entity';
import { Notification } from 'src/databases/entities/notification.entity';
import { UserRole } from 'src/common/enums/role.enum';

type TgCtx = Context & {
  message?: any;
  from?: any;
};

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private bot: Telegraf;
  private broadcastWriting = new Map<number, boolean>();

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Parent) private readonly parentRepo: Repository<Parent>,
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(Attendance) private readonly attRepo: Repository<Attendance>,
    @InjectRepository(TestResult) private readonly resultRepo: Repository<TestResult>,
    @InjectRepository(Test) private readonly testRepo: Repository<Test>,
    @InjectRepository(Notification) private readonly notificationRepo: Repository<Notification>,
  ) {
    this.bot = new Telegraf(process.env.BOT_TOKEN || '');
  }

  onModuleInit() {
    this.setupCommands();

    this.bot.catch(async (err: any, ctx: any) => {
      console.error('❌ Telegram bot global error:', err?.message ?? err);
      try {
        await ctx.reply('❌ Botda xatolik yuz berdi. Iltimos, /menu ni bosing.');
      } catch {}
    });

    this.bot
      .launch()
      .then(() => console.log('✅ Telegram Bot muvaffaqiyatli ishga tushdi!'))
      .catch((err) => console.error('❌ Telegram bot xatosi:', err.message));
  }

  async onModuleDestroy() {
    await this.bot.stop('app shutdown');
  }

  private normalizePhone(phone: string): string {
    if (!phone) return '';

    let normalized = phone.replace(/[^\+\d]/g, '');

    if (normalized.startsWith('998')) {
      normalized = '+' + normalized;
    }

    if (!normalized.startsWith('+998')) {
      normalized = normalized.replace(/^\+?0?998?/, '');
      normalized = '+998' + normalized;
    }

    return normalized.length === 13 && normalized.startsWith('+998') ? normalized : '';
  }

  private async getCurrentUser(telegramId: string): Promise<User | null> {
    const userId = await sessionStore.get(Number(telegramId));

    if (!userId) {
      return null;
    }

    return this.userRepo.findOne({
      where: { id: userId },
      relations: ['direction', 'branch'],
    });
  }

  private getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      SUPERADMIN: '👑 Superadmin',
      ADMIN: '🛡 Admin',
      TEACHER: '👨‍🏫 Ustoz',
      SUPPORT: '🧑‍💼 Support',
      STUDENT: "🎓 O'quvchi",
      PARENT: '👨‍👩‍👦 Ota-ona',
    };

    return labels[role] ?? role;
  }

  private getMainKeyboard(role: UserRole) {
    switch (role) {
      case UserRole.SUPERADMIN:
      case UserRole.ADMIN:
        return Markup.keyboard([
          ['📊 Statistika', '👥 Userlar'],
          ['🏫 Guruhlar', "🎓 O'quvchilar"],
          ["👨‍🏫 Ustozlar", '🧑‍💼 Supportlar'],
          ['📝 Testlar', "📢 E'lon yuborish"],
          ['⚙️ Profil'],
        ]).resize();

      case UserRole.TEACHER:
        return Markup.keyboard([
          ['👥 Mening guruhlarim', "🎓 O'quvchilarim"],
          ['📝 Test natijalari', '✅ Davomat'],
          ['🏆 Reyting', '⚙️ Profil'],
          ['📞 Admin bilan bog‘lanish'],
        ]).resize();

      case UserRole.SUPPORT:
        return Markup.keyboard([
          ['👥 Mening guruhlarim', "🎓 O'quvchilar"],
          ['📞 Ota-onalar', '✅ Davomat'],
          ['📊 Guruh holati', '⚙️ Profil'],
          ['📞 Admin bilan bog‘lanish'],
        ]).resize();

      case UserRole.STUDENT:
        return Markup.keyboard([
          ['📝 Mening testlarim', '📊 Natijalarim'],
          ['✅ Davomatim', '👥 Guruhim'],
          ['🏆 Reytingim', '⚙️ Profil'],
          ['📞 Admin bilan bog‘lanish'],
        ]).resize();

      case UserRole.PARENT:
        return Markup.keyboard([
          ['👧 Farzandlarim', '📝 Test natijalari'],
          ['✅ Davomat', '📊 Oylik hisobot'],
          ['📞 Support bilan aloqa', '⚙️ Profil'],
        ]).resize();

      default:
        return Markup.keyboard([['⚙️ Profil']]).resize();
    }
  }

  private async requireLinkedUser(ctx: TgCtx): Promise<User | null> {
    const telegramId = ctx.from?.id?.toString();

    if (!telegramId) {
      await ctx.reply('❌ Telegram ID aniqlanmadi.');
      return null;
    }

    const user = await this.getCurrentUser(telegramId);

    if (!user) {
      await ctx.reply("ℹ️ Iltimos, avval /start bosing va telefon raqamingizni yuboring.");
      await this.showWelcome(ctx);
      return null;
    }

    return user;
  }

  private async showWelcome(ctx: TgCtx) {
    await ctx.reply(
      `👋 <b>Edu Najot Ta'lim CRM botiga xush kelibsiz!</b>

Akkauntingizni botga bog‘lash uchun telefon raqamingizni yuboring.

Telefon raqam CRM’dagi user telefon raqami bilan bir xil bo‘lishi kerak.`,
      {
        parse_mode: 'HTML',
        ...Markup.keyboard([[Markup.button.contactRequest('📲 Kontaktni yuborish')]]).resize(),
      },
    );
  }

  private async linkPhoneToUser(ctx: TgCtx, rawPhone: string) {
    try {
      const phone = this.normalizePhone(rawPhone);

      if (!phone) {
        await ctx.reply("❌ Telefon raqam noto‘g‘ri. Format: +998XXXXXXXXX");
        return;
      }

      let user = await this.userRepo.findOne({ where: { phone } });

      if (!user) {
        const parentByPhone2 = await this.parentRepo.findOne({
          where: { phone2: phone },
          relations: ['user'],
        });

        if (parentByPhone2?.user) {
          user = parentByPhone2.user;
        }
      }

      if (!user) {
        await ctx.reply("❌ Bu telefon raqam tizimda topilmadi.\nMa'muriyatga murojaat qiling.");
        return;
      }

      // Har /start bosilganda telefon raqam qayta so'raladi.
      // Kontakt yuborilgandan keyin telegramId yangilanadi.
      // Bu notificationlar ishlashi uchun kerak.
      user.telegramId = ctx.from!.id.toString();
      await this.userRepo.save(user);
      await sessionStore.set(ctx.from!.id, user.id);

      await ctx.reply(
        `✅ <b>Akkaunt botga bog‘landi!</b>

👤 <b>${user.fullName}</b>
📞 ${user.phone}
🔑 ${this.getRoleLabel(user.role)}`,
        { parse_mode: 'HTML' },
      );

      await this.showMainMenu(ctx, user);
    } catch (error) {
      console.error('Telegram link phone error:', error);
      await ctx.reply('❌ Akkauntni bog‘lashda xatolik yuz berdi.');
    }
  }

  private async showMainMenu(ctx: TgCtx, user: User) {
    let text = `🏠 <b>Bosh menyu</b>

👤 <b>${user.fullName}</b>
🔑 Rol: <b>${this.getRoleLabel(user.role)}</b>`;

    if (user.direction?.name) {
      text += `\n📚 Yo‘nalish: <b>${user.direction.name}</b>`;
    }

    if (user.branch?.name) {
      text += `\n🏢 Filial: <b>${user.branch.name}</b>`;
    }

    text += `\n\nKerakli bo‘limni tanlang 👇`;

    await ctx.reply(text, {
      parse_mode: 'HTML',
      ...this.getMainKeyboard(user.role),
    });
  }

  private async showProfile(ctx: TgCtx, user: User) {
    await ctx.reply(
      `⚙️ <b>Profil</b>

👤 Ism: <b>${user.fullName}</b>
📞 Telefon: <b>${user.phone}</b>
👥 Username: <b>${user.username}</b>
🔑 Rol: <b>${this.getRoleLabel(user.role)}</b>
${user.direction?.name ? `📚 Yo‘nalish: <b>${user.direction.name}</b>\n` : ''}${user.branch?.name ? `🏢 Filial: <b>${user.branch.name}</b>\n` : ''}`,
      { parse_mode: 'HTML' },
    );
  }

  private async showAdminStats(ctx: TgCtx) {
    const [
      users,
      students,
      parents,
      groups,
      tests,
      results,
      activeTelegramUsers,
    ] = await Promise.all([
      this.userRepo.count(),
      this.studentRepo.count(),
      this.parentRepo.count(),
      this.groupRepo.count(),
      this.testRepo.count(),
      this.resultRepo.count(),
      this.userRepo.count({ where: { telegramId: Not(IsNull()) } }),
    ]);

    const currentResults = await this.resultRepo.find({ where: { isCurrent: true } });
    const avgScore = currentResults.length
      ? Math.round(currentResults.reduce((sum, r) => sum + Number(r.score), 0) / currentResults.length)
      : 0;

    await ctx.reply(
      `📊 <b>Tizim statistikasi</b>

👥 Userlar: <b>${users}</b>
🎓 O‘quvchilar: <b>${students}</b>
👨‍👩‍👦 Ota-onalar: <b>${parents}</b>
🏫 Guruhlar: <b>${groups}</b>
📝 Testlar: <b>${tests}</b>
📌 Test natijalari: <b>${results}</b>
📈 O‘rtacha ball: <b>${avgScore}%</b>
🤖 Botga bog‘langanlar: <b>${activeTelegramUsers}</b>`,
      { parse_mode: 'HTML' },
    );
  }

  private async showUsersStats(ctx: TgCtx) {
    const roles = await Promise.all(
      Object.values(UserRole).map(async (role) => ({
        role,
        count: await this.userRepo.count({ where: { role } }),
      })),
    );

    let msg = `👥 <b>Userlar bo‘yicha statistika</b>\n\n`;

    for (const item of roles) {
      msg += `${this.getRoleLabel(item.role)}: <b>${item.count}</b>\n`;
    }

    await ctx.reply(msg, { parse_mode: 'HTML' });
  }

  private async showGroupsList(ctx: TgCtx, user: User) {
    let groups: Group[] = [];

    if ([UserRole.SUPERADMIN, UserRole.ADMIN].includes(user.role)) {
      groups = await this.groupRepo.find({
        relations: ['teacher', 'support', 'direction'],
        order: { id: 'DESC' },
        take: 15,
      });
    }

    if (user.role === UserRole.TEACHER) {
      groups = await this.groupRepo.find({
        where: { teacherId: user.id },
        relations: ['teacher', 'support', 'direction'],
        order: { id: 'DESC' },
      });
    }

    if (user.role === UserRole.SUPPORT) {
      groups = await this.groupRepo.find({
        where: { supportId: user.id },
        relations: ['teacher', 'support', 'direction'],
        order: { id: 'DESC' },
      });
    }

    if (!groups.length) {
      await ctx.reply('ℹ️ Sizga tegishli guruhlar topilmadi.');
      return;
    }

    let msg = `🏫 <b>Guruhlar</b>\n\n`;

    for (const group of groups) {
      const studentsCount = await this.studentRepo.count({ where: { groupId: group.id } });

      msg += `👥 <b>${group.name}</b>\n`;
      msg += `📚 Yo‘nalish: ${group.direction?.name ?? '—'}\n`;
      msg += `👨‍🏫 Ustoz: ${group.teacher?.fullName ?? '—'}\n`;
      msg += `🧑‍💼 Support: ${group.support?.fullName ?? '—'}\n`;
      msg += `🎓 O‘quvchilar: <b>${studentsCount}</b>\n`;
      msg += `📅 Kunlar: ${group.lessonDays?.join(', ') || '—'}\n`;
      msg += `🕐 Vaqt: ${group.lessonTime || '—'}\n`;
      msg += `─────────────────\n`;
    }

    await ctx.reply(msg, { parse_mode: 'HTML' });
  }

  private async showStudentsList(ctx: TgCtx, user: User) {
    let students: Student[] = [];

    if ([UserRole.SUPERADMIN, UserRole.ADMIN].includes(user.role)) {
      students = await this.studentRepo.find({
        relations: ['user', 'group', 'parent', 'parent.user'],
        order: { id: 'DESC' },
        take: 20,
      });
    }

    if (user.role === UserRole.TEACHER) {
      const groups = await this.groupRepo.find({ where: { teacherId: user.id } });
      const groupIds = groups.map((g) => g.id);

      students = groupIds.length
        ? await this.studentRepo.find({
            where: groupIds.map((groupId) => ({ groupId })),
            relations: ['user', 'group', 'parent', 'parent.user'],
            order: { id: 'DESC' },
          })
        : [];
    }

    if (user.role === UserRole.SUPPORT) {
      const groups = await this.groupRepo.find({ where: { supportId: user.id } });
      const groupIds = groups.map((g) => g.id);

      students = groupIds.length
        ? await this.studentRepo.find({
            where: groupIds.map((groupId) => ({ groupId })),
            relations: ['user', 'group', 'parent', 'parent.user'],
            order: { id: 'DESC' },
          })
        : [];
    }

    if (!students.length) {
      await ctx.reply('ℹ️ O‘quvchilar topilmadi.');
      return;
    }

    let msg = `🎓 <b>O‘quvchilar</b>\n\n`;

    for (const student of students.slice(0, 20)) {
      msg += `👤 <b>${student.user?.fullName ?? '—'}</b>\n`;
      msg += `📞 ${student.user?.phone ?? '—'}\n`;
      msg += `🏫 Guruh: ${student.group?.name ?? 'Biriktirilmagan'}\n`;
      msg += `👨‍👩‍👦 Ota-ona: ${student.parent?.user?.fullName ?? '—'}\n`;
      msg += `─────────────────\n`;
    }

    await ctx.reply(msg, { parse_mode: 'HTML' });
  }


  private async showTeachersList(ctx: TgCtx) {
    const teachers = await this.userRepo.find({
      where: { role: UserRole.TEACHER },
      relations: ['direction', 'branch'],
      order: { id: 'DESC' },
      take: 30,
    });

    if (!teachers.length) {
      await ctx.reply('ℹ️ Ustozlar topilmadi.');
      return;
    }

    let msg = `👨‍🏫 <b>Ustozlar ro'yxati</b>\n\n`;

    for (const teacher of teachers) {
      const groupsCount = await this.groupRepo.count({ where: { teacherId: teacher.id } });

      msg += `👤 <b>${teacher.fullName}</b>\n`;
      msg += `📞 ${teacher.phone}\n`;
      msg += `📚 Yo'nalish: ${teacher.direction?.name ?? '—'}\n`;
      msg += `🏢 Filial: ${teacher.branch?.name ?? '—'}\n`;
      msg += `👥 Guruhlar: <b>${groupsCount}</b>\n`;
      msg += `─────────────────\n`;
    }

    await ctx.reply(msg, { parse_mode: 'HTML' });
  }

  private async showSupportsList(ctx: TgCtx) {
    const supports = await this.userRepo.find({
      where: { role: UserRole.SUPPORT },
      relations: ['direction', 'branch'],
      order: { id: 'DESC' },
      take: 30,
    });

    if (!supports.length) {
      await ctx.reply('ℹ️ Supportlar topilmadi.');
      return;
    }

    let msg = `🧑‍💼 <b>Supportlar ro'yxati</b>\n\n`;

    for (const support of supports) {
      const groupsCount = await this.groupRepo.count({ where: { supportId: support.id } });

      msg += `👤 <b>${support.fullName}</b>\n`;
      msg += `📞 ${support.phone}\n`;
      msg += `📚 Yo'nalish: ${support.direction?.name ?? '—'}\n`;
      msg += `🏢 Filial: ${support.branch?.name ?? '—'}\n`;
      msg += `👥 Guruhlar: <b>${groupsCount}</b>\n`;
      msg += `─────────────────\n`;
    }

    await ctx.reply(msg, { parse_mode: 'HTML' });
  }


  private async showParentsList(ctx: TgCtx, user: User) {
    if (![UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPERADMIN].includes(user.role)) {
      await ctx.reply('❌ Sizda bu bo‘lim uchun ruxsat yo‘q.');
      return;
    }

    let students: Student[] = [];

    if ([UserRole.SUPERADMIN, UserRole.ADMIN].includes(user.role)) {
      students = await this.studentRepo.find({
        relations: ['user', 'group', 'parent', 'parent.user'],
        order: { id: 'DESC' },
        take: 20,
      });
    }

    if (user.role === UserRole.SUPPORT) {
      const groups = await this.groupRepo.find({ where: { supportId: user.id } });
      const groupIds = groups.map((g) => g.id);

      students = groupIds.length
        ? await this.studentRepo.find({
            where: groupIds.map((groupId) => ({ groupId })),
            relations: ['user', 'group', 'parent', 'parent.user'],
            order: { id: 'DESC' },
          })
        : [];
    }

    if (!students.length) {
      await ctx.reply('ℹ️ Ota-onalar topilmadi.');
      return;
    }

    let msg = `📞 <b>Ota-onalar ro‘yxati</b>\n\n`;

    for (const student of students.slice(0, 20)) {
      if (!student.parent?.user) continue;

      msg += `👨‍👩‍👦 <b>${student.parent.user.fullName}</b>\n`;
      msg += `📞 ${student.parent.user.phone}\n`;
      msg += `👧 Farzand: ${student.user?.fullName ?? '—'}\n`;
      msg += `🏫 Guruh: ${student.group?.name ?? '—'}\n`;
      msg += `─────────────────\n`;
    }

    await ctx.reply(msg, { parse_mode: 'HTML' });
  }

  private async showStudentOwnInfo(ctx: TgCtx, user: User) {
    const student = await this.studentRepo.findOne({
      where: { userId: user.id },
      relations: ['user', 'group', 'group.teacher', 'group.support', 'group.direction'],
    });

    if (!student) {
      await ctx.reply('❌ O‘quvchi profili topilmadi.');
      return;
    }

    await ctx.reply(
      `👥 <b>Mening guruhim</b>

👤 O‘quvchi: <b>${student.user?.fullName}</b>
🏫 Guruh: <b>${student.group?.name ?? 'Biriktirilmagan'}</b>
📚 Yo‘nalish: <b>${student.group?.direction?.name ?? '—'}</b>
👨‍🏫 Ustoz: <b>${student.group?.teacher?.fullName ?? '—'}</b>
🧑‍💼 Support: <b>${student.group?.support?.fullName ?? '—'}</b>
📅 Dars kunlari: <b>${student.group?.lessonDays?.join(', ') || '—'}</b>
🕐 Vaqt: <b>${student.group?.lessonTime || '—'}</b>`,
      { parse_mode: 'HTML' },
    );
  }

  private async showStudentResults(ctx: TgCtx, user: User) {
    const student = await this.studentRepo.findOne({
      where: { userId: user.id },
      relations: ['user', 'group', 'results', 'results.test'],
    });

    if (!student) {
      await ctx.reply('❌ O‘quvchi profili topilmadi.');
      return;
    }

    await this.sendStudentResultCard(ctx, student);
  }

  private async sendStudentResultCard(ctx: TgCtx, student: Student) {
    // Barcha urinishlar hisobga olinadi: isCurrent=false arxiv natijalar ham ko'rsatiladi.
    const results = (student.results ?? [])
      .sort((a, b) => b.id - a.id);

    const total = results.length;
    const avg = total
      ? Math.round(results.reduce((sum, r) => sum + Number(r.score), 0) / total)
      : 0;

    const highest = total ? Math.max(...results.map((r) => Number(r.score))) : 0;
    const lowest = total ? Math.min(...results.map((r) => Number(r.score))) : 0;

    let msg = `📊 <b>Test natijalari</b>\n\n`;
    msg += `👤 <b>${student.user?.fullName ?? '—'}</b>\n`;
    msg += `🏫 Guruh: <b>${student.group?.name ?? '—'}</b>\n`;
    msg += `─────────────────\n`;
    msg += `📝 Jami test: <b>${total}</b>\n`;
    msg += `📈 O‘rtacha: <b>${avg}%</b>\n`;
    msg += `🏆 Eng yuqori: <b>${highest}%</b>\n`;
    msg += `📉 Eng past: <b>${lowest}%</b>\n`;

    if (results.length) {
      msg += `─────────────────\n<b>Oxirgi natijalar:</b>\n\n`;

      for (const r of results.slice(0, 5)) {
        const minScore = r.test?.minScore ?? 60;
        const passed = Number(r.score) >= minScore;

        msg += `${passed ? '✅' : '❌'} <b>${r.test?.title ?? 'Test'}</b>\n`;
        msg += `🎯 Ball: <b>${r.score}/100</b> | Min: ${minScore} | 🔢 ${r.attempt}-urinish\n\n`;
      }
    } else {
      msg += `\nℹ️ Hali test natijalari yo‘q.`;
    }

    await ctx.reply(msg, { parse_mode: 'HTML' });
  }

  private async showStudentAttendance(ctx: TgCtx, user: User) {
    const student = await this.studentRepo.findOne({
      where: { userId: user.id },
      relations: ['user', 'group'],
    });

    if (!student) {
      await ctx.reply('❌ O‘quvchi profili topilmadi.');
      return;
    }

    await this.sendAttendanceCard(ctx, student.id, student.user?.fullName ?? '—');
  }

  private async sendAttendanceCard(ctx: TgCtx, studentId: number, fullName: string) {
    const attendances = await this.attRepo.find({
      where: { studentId },
      order: { timestamp: 'DESC' },
      take: 30,
    });

    const total = attendances.length;
    const present = attendances.filter((a) => a.isPresent).length;
    const absent = total - present;
    const percent = total ? Math.round((present / total) * 100) : 0;

    let msg = `✅ <b>Davomat</b>\n\n`;
    msg += `👤 <b>${fullName}</b>\n`;
    msg += `─────────────────\n`;
    msg += `📌 Oxirgi yozuvlar: <b>${total}</b>\n`;
    msg += `✅ Kelgan: <b>${present}</b>\n`;
    msg += `❌ Kelmagan: <b>${absent}</b>\n`;
    msg += `📊 Foiz: <b>${percent}%</b>\n\n`;

    if (attendances.length) {
      msg += `<b>Oxirgi 5 ta:</b>\n`;
      for (const a of attendances.slice(0, 5)) {
        const date = new Date(a.timestamp).toLocaleDateString('uz-UZ');
        msg += `${a.isPresent ? '✅' : '❌'} ${date}\n`;
      }
    }

    await ctx.reply(msg, { parse_mode: 'HTML' });
  }

  private async showParentChildren(ctx: TgCtx, user: User) {
    const parent = await this.parentRepo.findOne({
      where: { userId: user.id },
      relations: ['students', 'students.user', 'students.group'],
    });

    if (!parent || !parent.students?.length) {
      await ctx.reply('❌ Farzandlar topilmadi.');
      return;
    }

    let msg = `👧 <b>Farzandlarim</b>\n\n`;

    for (const student of parent.students) {
      msg += `👤 <b>${student.user?.fullName ?? '—'}</b>\n`;
      msg += `🏫 Guruh: ${student.group?.name ?? 'Biriktirilmagan'}\n`;
      msg += `─────────────────\n`;
    }

    await ctx.reply(msg, { parse_mode: 'HTML' });
  }

  private async showParentResults(ctx: TgCtx, user: User) {
    const parent = await this.parentRepo.findOne({
      where: { userId: user.id },
      relations: ['students', 'students.user', 'students.group', 'students.results', 'students.results.test'],
    });

    if (!parent || !parent.students?.length) {
      await ctx.reply('❌ Farzandlar topilmadi.');
      return;
    }

    for (const student of parent.students) {
      await this.sendStudentResultCard(ctx, student);
    }
  }

  private async showParentAttendance(ctx: TgCtx, user: User) {
    const parent = await this.parentRepo.findOne({
      where: { userId: user.id },
      relations: ['students', 'students.user'],
    });

    if (!parent || !parent.students?.length) {
      await ctx.reply('❌ Farzandlar topilmadi.');
      return;
    }

    for (const student of parent.students) {
      await this.sendAttendanceCard(ctx, student.id, student.user?.fullName ?? '—');
    }
  }

  private async showTeacherRating(ctx: TgCtx, user: User) {
    const groups = await this.groupRepo.find({ where: { teacherId: user.id } });
    const groupIds = groups.map((g) => g.id);

    if (!groupIds.length) {
      await ctx.reply('ℹ️ Sizga biriktirilgan guruhlar yo‘q.');
      return;
    }

    const students = await this.studentRepo.find({
      where: groupIds.map((groupId) => ({ groupId })),
      relations: ['user', 'group', 'results'],
    });

    const rated = students
      .map((student) => {
        const results = (student.results ?? []);
        const avg = results.length
          ? Math.round(results.reduce((sum, r) => sum + Number(r.score), 0) / results.length)
          : 0;

        return { student, avg };
      })
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10);

    let msg = `🏆 <b>O‘quvchilar reytingi</b>\n\n`;

    rated.forEach((item, index) => {
      msg += `${index + 1}. <b>${item.student.user?.fullName ?? '—'}</b> — ${item.avg}%\n`;
    });

    await ctx.reply(msg || 'ℹ️ Reyting uchun ma’lumot yo‘q.', { parse_mode: 'HTML' });
  }

  private async showContactAdmins(ctx: TgCtx) {
    await ctx.reply(
      `📞 <b>Admin bilan bog‘lanish</b>

Telegram: <b>@anorkhulov</b>

Savol yoki muammo bo‘lsa shu username orqali yozing.`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.url('💬 Telegramda yozish', 'https://t.me/anorkhulov')],
        ]),
      },
    );
  }


  private async showMonthlyReport(ctx: TgCtx, user: User) {
    if (user.role === UserRole.PARENT) {
      const parent = await this.parentRepo.findOne({
        where: { userId: user.id },
        relations: ['students', 'students.user', 'students.results', 'students.attendance'],
      });

      if (!parent || !parent.students?.length) {
        await ctx.reply('❌ Farzandlar topilmadi.');
        return;
      }

      let msg = `📊 <b>Oylik hisobot</b>\n\n`;

      for (const student of parent.students) {
        const results = (student.results ?? []);
        const avg = results.length
          ? Math.round(results.reduce((sum, r) => sum + Number(r.score), 0) / results.length)
          : 0;

        const attendance = student.attendance ?? [];
        const present = attendance.filter((a) => a.isPresent).length;
        const attendancePercent = attendance.length ? Math.round((present / attendance.length) * 100) : 0;

        msg += `👧 <b>${student.user?.fullName ?? '—'}</b>\n`;
        msg += `📈 Test o‘rtacha: <b>${avg}%</b>\n`;
        msg += `✅ Davomat: <b>${attendancePercent}%</b>\n`;
        msg += `─────────────────\n`;
      }

      await ctx.reply(msg, { parse_mode: 'HTML' });
      return;
    }

    await ctx.reply('❌ Bu bo‘lim faqat ota-onalar uchun.');
  }

  private async startBroadcastMode(ctx: TgCtx, user: User) {
    if (![UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER].includes(user.role)) {
      await ctx.reply('❌ Sizda e’lon yuborish huquqi yo‘q.');
      return;
    }

    this.broadcastWriting.set(ctx.from!.id, true);

    const targetText =
      user.role === UserRole.TEACHER
        ? "E'lon faqat o‘zingizga biriktirilgan o‘quvchilar va ularning ota-onalariga yuboriladi."
        : "E'lon botga bog‘langan barcha foydalanuvchilarga yuboriladi.";

    await ctx.reply(
      `📢 <b>E'lon matnini yuboring</b>

${targetText}

Bekor qilish uchun: <b>Bekor qilish</b>`,
      { parse_mode: 'HTML' },
    );
  }

  private async handleBroadcastText(ctx: TgCtx, user: User, message: string) {
    this.broadcastWriting.delete(ctx.from!.id);

    if (message.toLowerCase().includes('bekor')) {
      await ctx.reply('❌ E’lon yuborish bekor qilindi.');
      await this.showMainMenu(ctx, user);
      return;
    }

    if (user.role === UserRole.TEACHER) {
      await this.broadcastFromTeacher(user, message);
      await ctx.reply('✅ E’lon o‘quvchilaringiz va ota-onalariga yuborildi.');
      return;
    }

    await this.broadcastFromAdmin(message);
    await ctx.reply('✅ E’lon barcha bog‘langan foydalanuvchilarga yuborildi.');
  }

  private async broadcastFromTeacher(user: User, message: string) {
    const groups = await this.groupRepo.find({ where: { teacherId: user.id } });
    const groupIds = groups.map((g) => g.id);

    if (!groupIds.length) return;

    const students = await this.studentRepo.find({
      where: groupIds.map((groupId) => ({ groupId })),
      relations: ['user', 'parent', 'parent.user'],
    });

    const telegramIds = new Set<string>();

    for (const student of students) {
      if (student.user?.telegramId) telegramIds.add(student.user.telegramId);
      if (student.parent?.user?.telegramId) telegramIds.add(student.parent.user.telegramId);
    }

    for (const telegramId of telegramIds) {
      await this.sendNotification(telegramId, `📢 <b>Ustozdan e’lon</b>\n\n${message}`);
    }
  }

  private async setupCommands() {
    this.bot.start(async (ctx: TgCtx) => {
      // Har safar /start bosilganda eski session o'chiriladi
      // va foydalanuvchidan telefon raqam qayta so'raladi.
      await sessionStore.delete(ctx.from!.id);
      await this.showWelcome(ctx);
    });

    this.bot.command('menu', async (ctx: TgCtx) => {
      const user = await this.requireLinkedUser(ctx);
      if (!user) return;
      await this.showMainMenu(ctx, user);
    });

    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        `ℹ️ <b>Yordam</b>

1. /start orqali botni ishga tushiring.
2. Kontakt yuboring.
3. CRM’dagi rolingizga qarab menyu ochiladi.

Muammo bo‘lsa admin bilan bog‘laning.`,
        { parse_mode: 'HTML' },
      );
    });

    this.bot.on('contact', async (ctx: TgCtx) => {
      const phone = ctx.message?.contact?.phone_number;
      if (!phone) return;
      await this.linkPhoneToUser(ctx, phone);
    });

    this.bot.on('text', async (ctx: TgCtx) => {
      const user = await this.requireLinkedUser(ctx);
      if (!user) return;

      const text = String(ctx.message?.text || '').trim();

      if (this.broadcastWriting.get(ctx.from!.id)) {
        await this.handleBroadcastText(ctx, user, text);
        return;
      }

      switch (text) {
        case '🏠 Bosh menyu':
        case '✅ Bog‘landim':
          return this.showMainMenu(ctx, user);

        case '⚙️ Profil':
          return this.showProfile(ctx, user);

        case '📊 Statistika':
          if (![UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.PARENT].includes(user.role)) {
            return ctx.reply('❌ Sizda bu bo‘lim uchun ruxsat yo‘q.');
          }
          return user.role === UserRole.PARENT
            ? this.showMonthlyReport(ctx, user)
            : this.showAdminStats(ctx);

        case '👥 Userlar':
          if (![UserRole.SUPERADMIN, UserRole.ADMIN].includes(user.role)) {
            return ctx.reply('❌ Sizda bu bo‘lim uchun ruxsat yo‘q.');
          }
          return this.showUsersStats(ctx);

        case '🏫 Guruhlar':
        case '👥 Mening guruhlarim':
          return this.showGroupsList(ctx, user);

        case "🎓 O'quvchilar":
        case "🎓 O'quvchilarim":
          return this.showStudentsList(ctx, user);

        case '👨‍🏫 Ustozlar':
          if (![UserRole.SUPERADMIN, UserRole.ADMIN].includes(user.role)) {
            return ctx.reply('❌ Sizda bu bo‘lim uchun ruxsat yo‘q.');
          }
          return this.showTeachersList(ctx);

        case '🧑‍💼 Supportlar':
          if (![UserRole.SUPERADMIN, UserRole.ADMIN].includes(user.role)) {
            return ctx.reply('❌ Sizda bu bo‘lim uchun ruxsat yo‘q.');
          }
          return this.showSupportsList(ctx);

        case '📞 Ota-onalar':
          return this.showParentsList(ctx, user);

        case '📝 Testlar':
          if (![UserRole.SUPERADMIN, UserRole.ADMIN].includes(user.role)) {
            return ctx.reply('❌ Sizda bu bo‘lim uchun ruxsat yo‘q.');
          }
          return this.showTestsSummary(ctx);

        case '📝 Mening testlarim':
          return this.showStudentAvailableTests(ctx, user);

        case '📝 Mening natijalarim':
        case '📊 Natijalarim':
        case '📝 Test natijalari':
          if (user.role === UserRole.STUDENT) return this.showStudentResults(ctx, user);
          if (user.role === UserRole.PARENT) return this.showParentResults(ctx, user);
          if ([UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN].includes(user.role)) {
            return this.showTeacherResultsSummary(ctx, user);
          }
          return ctx.reply('❌ Sizda bu bo‘lim uchun ruxsat yo‘q.');

        case '✅ Davomat':
        case '📅 Davomat':
        case '✅ Davomatim':
          if (user.role === UserRole.STUDENT) return this.showStudentAttendance(ctx, user);
          if (user.role === UserRole.PARENT) return this.showParentAttendance(ctx, user);
          if ([UserRole.TEACHER, UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPERADMIN].includes(user.role)) {
            return this.showGroupAttendanceSummary(ctx, user);
          }
          return ctx.reply('❌ Sizda bu bo‘lim uchun ruxsat yo‘q.');

        case '👥 Guruhim':
          return this.showStudentOwnInfo(ctx, user);

        case '🏆 Reyting':
        case '🏆 Reytingim':
          if (user.role === UserRole.TEACHER) return this.showTeacherRating(ctx, user);
          if (user.role === UserRole.STUDENT) return this.showStudentRank(ctx, user);
          return ctx.reply('❌ Sizda bu bo‘lim uchun ruxsat yo‘q.');

        case '📊 Guruh holati':
          return this.showGroupStatusForSupport(ctx, user);

        case '👧 Farzandlarim':
          return this.showParentChildren(ctx, user);

        case '📊 Oylik hisobot':
          return this.showMonthlyReport(ctx, user);

        case "📢 E'lon yuborish":
          return this.startBroadcastMode(ctx, user);

        case '📞 Admin bilan bog‘lanish':
        case '📞 Support bilan aloqa':
          return this.showContactAdmins(ctx);

        case 'ℹ️ Mening huquqlarim':
          return this.showSupportRights(ctx);

        default:
          return ctx.reply(
            'Men bu buyruqni tushunmadim. Menyudan tanlang yoki /menu yozing.',
            this.getMainKeyboard(user.role),
          );
      }
    });
  }

  private async showTestsSummary(ctx: TgCtx) {
    const [daily, weekly, monthly, total] = await Promise.all([
      this.testRepo.count({ where: { type: 'DAILY' as any } }),
      this.testRepo.count({ where: { type: 'WEEKLY' as any } }),
      this.testRepo.count({ where: { type: 'MONTHLY' as any } }),
      this.testRepo.count(),
    ]);

    await ctx.reply(
      `📝 <b>Testlar statistikasi</b>

📌 Jami: <b>${total}</b>
🟢 Kunlik: <b>${daily}</b>
🔵 Haftalik: <b>${weekly}</b>
🟣 Oylik: <b>${monthly}</b>`,
      { parse_mode: 'HTML' },
    );
  }

  private async showStudentAvailableTests(ctx: TgCtx, user: User) {
    const student = await this.studentRepo.findOne({
      where: { userId: user.id },
      relations: ['group'],
    });

    if (!student?.groupId) {
      await ctx.reply('ℹ️ Siz hali guruhga biriktirilmagansiz.');
      return;
    }

    const tests = await this.testRepo.find({
      where: [
        { groupId: student.groupId },
        { groupId: IsNull(), directionId: student.group?.directionId },
      ],
      order: { id: 'DESC' },
      take: 10,
    });

    if (!tests.length) {
      await ctx.reply('ℹ️ Sizga tegishli testlar hozircha yo‘q.');
      return;
    }

    let msg = `📝 <b>Mening testlarim</b>\n\n`;

    tests.forEach((test, index) => {
      msg += `${index + 1}. <b>${test.title}</b>\n`;
      msg += `📌 Turi: ${test.type}\n`;
      msg += `🎯 Min ball: ${test.minScore ?? 60}\n\n`;
    });

    await ctx.reply(msg, { parse_mode: 'HTML' });
  }

  private async showTeacherResultsSummary(ctx: TgCtx, user: User) {
    let students: Student[] = [];

    if (user.role === UserRole.TEACHER) {
      const groups = await this.groupRepo.find({ where: { teacherId: user.id } });
      const groupIds = groups.map((g) => g.id);

      students = groupIds.length
        ? await this.studentRepo.find({
            where: groupIds.map((groupId) => ({ groupId })),
            relations: ['user', 'group', 'results'],
          })
        : [];
    } else {
      students = await this.studentRepo.find({
        relations: ['user', 'group', 'results'],
        take: 30,
      });
    }

    if (!students.length) {
      await ctx.reply('ℹ️ Natijalar uchun o‘quvchilar topilmadi.');
      return;
    }

    let msg = `📝 <b>Test natijalari summary</b>\n\n`;

    for (const student of students.slice(0, 15)) {
      const results = (student.results ?? []);
      const avg = results.length
        ? Math.round(results.reduce((sum, r) => sum + Number(r.score), 0) / results.length)
        : 0;

      msg += `👤 <b>${student.user?.fullName ?? '—'}</b>\n`;
      msg += `🏫 ${student.group?.name ?? '—'} | 📈 ${avg}% | 📝 ${results.length} test\n`;
      msg += `─────────────────\n`;
    }

    await ctx.reply(msg, { parse_mode: 'HTML' });
  }

  private async showGroupAttendanceSummary(ctx: TgCtx, user: User) {
    let groups: Group[] = [];

    if ([UserRole.SUPERADMIN, UserRole.ADMIN].includes(user.role)) {
      groups = await this.groupRepo.find({ order: { id: 'DESC' }, take: 10 });
    }

    if (user.role === UserRole.TEACHER) {
      groups = await this.groupRepo.find({ where: { teacherId: user.id } });
    }

    if (user.role === UserRole.SUPPORT) {
      groups = await this.groupRepo.find({ where: { supportId: user.id } });
    }

    if (!groups.length) {
      await ctx.reply('ℹ️ Guruhlar topilmadi.');
      return;
    }

    let msg = `✅ <b>Guruhlar davomati</b>\n\n`;

    for (const group of groups.slice(0, 10)) {
      const students = await this.studentRepo.find({ where: { groupId: group.id } });
      const studentIds = students.map((s) => s.id);

      let total = 0;
      let present = 0;

      if (studentIds.length) {
        const records = await this.attRepo.find({
          where: studentIds.map((studentId) => ({ studentId })),
          take: 200,
        });

        total = records.length;
        present = records.filter((a) => a.isPresent).length;
      }

      const percent = total ? Math.round((present / total) * 100) : 0;

      msg += `🏫 <b>${group.name}</b>\n`;
      msg += `🎓 O‘quvchi: ${students.length}\n`;
      msg += `✅ Davomat: ${percent}%\n`;
      msg += `─────────────────\n`;
    }

    await ctx.reply(msg, { parse_mode: 'HTML' });
  }

  private async showGroupStatusForSupport(ctx: TgCtx, user: User) {
    if (![UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPERADMIN].includes(user.role)) {
      await ctx.reply('❌ Sizda bu bo‘lim uchun ruxsat yo‘q.');
      return;
    }

    await this.showGroupsList(ctx, user);
  }

  private async showStudentRank(ctx: TgCtx, user: User) {
    const student = await this.studentRepo.findOne({
      where: { userId: user.id },
      relations: ['user', 'group'],
    });

    if (!student?.groupId) {
      await ctx.reply('ℹ️ Siz hali guruhga biriktirilmagansiz.');
      return;
    }

    const groupStudents = await this.studentRepo.find({
      where: { groupId: student.groupId },
      relations: ['user', 'results'],
    });

    const ranked = groupStudents
      .map((s) => {
        const results = (s.results ?? []);
        const avg = results.length
          ? Math.round(results.reduce((sum, r) => sum + Number(r.score), 0) / results.length)
          : 0;

        return { id: s.id, fullName: s.user?.fullName ?? '—', avg };
      })
      .sort((a, b) => b.avg - a.avg);

    const index = ranked.findIndex((r) => r.id === student.id);

    await ctx.reply(
      `🏆 <b>Mening reytingim</b>

👤 ${student.user?.fullName}
🏫 ${student.group?.name ?? '—'}
📊 O‘rtacha ball: <b>${ranked[index]?.avg ?? 0}%</b>
🏅 Guruhdagi o‘rnim: <b>${index >= 0 ? index + 1 : '—'} / ${ranked.length}</b>`,
      { parse_mode: 'HTML' },
    );
  }

  private async showSupportRights(ctx: TgCtx) {
    await ctx.reply(
      `ℹ️ <b>Support imkoniyatlari</b>

👥 Biriktirilgan guruhlarni ko‘rish
🎓 Guruh o‘quvchilarini ko‘rish
📞 Ota-onalar kontaktlarini ko‘rish
✅ Davomat va guruh holatini kuzatish
📞 Admin bilan bog‘lanish`,
      { parse_mode: 'HTML' },
    );
  }



  private async saveSiteNotification(payload: {
    recipientId: number;
    senderId?: number;
    title?: string;
    message: string;
    type?: string;
  }) {
    try {
      const notification = this.notificationRepo.create({
        recipientId: payload.recipientId,
        senderId: payload.senderId,
        title: payload.title ?? 'Xabar',
        message: payload.message,
        type: payload.type ?? 'MESSAGE',
      });

      await this.notificationRepo.save(notification);
    } catch (error) {
      console.error('saveSiteNotification error:', error?.message ?? error);
    }
  }

  private async saveSiteNotifications(payload: {
    recipientIds: number[];
    senderId?: number;
    title?: string;
    message: string;
    type?: string;
  }) {
    try {
      if (!payload.recipientIds.length) return;

      const notifications = payload.recipientIds.map((recipientId) =>
        this.notificationRepo.create({
          recipientId,
          senderId: payload.senderId,
          title: payload.title ?? 'Xabar',
          message: payload.message,
          type: payload.type ?? 'MESSAGE',
        }),
      );

      await this.notificationRepo.save(notifications);
    } catch (error) {
      console.error('saveSiteNotifications error:', error?.message ?? error);
    }
  }

  async sendNotificationByPhone(phone: string, message: string, sender?: any): Promise<void> {
    const normalized = this.normalizePhone(phone);

    if (!normalized) {
      throw new Error("Telefon raqam noto'g'ri");
    }

    let user = await this.userRepo.findOne({
      where: { phone: normalized },
      select: ['id', 'fullName', 'phone', 'telegramId'],
    });

    if (!user) {
      const parentWithPhone2 = await this.parentRepo.findOne({
        where: { phone2: normalized },
        relations: ['user'],
      });

      if (parentWithPhone2?.user) {
        user = parentWithPhone2.user;
      }
    }

    if (!user) {
      throw new Error("Bu telefon raqamli foydalanuvchi topilmadi");
    }

    if (!user.telegramId) {
      throw new Error(`${user.fullName} Telegram botini ulamagan`);
    }

    let senderName = '';

    if (sender?.id) {
      const fullSender = await this.userRepo.findOne({
        where: { id: Number(sender.id) },
        select: ['id', 'fullName', 'username'],
      });

      senderName = fullSender?.fullName || fullSender?.username || '';
    }

    const senderInfo = senderName ? `👤 Kimdan: <b>${senderName}</b>\n\n` : '';

    await this.saveSiteNotification({
      recipientId: user.id,
      senderId: sender?.id ? Number(sender.id) : undefined,
      title: 'Xabar',
      message,
      type: 'MESSAGE',
    });

    await this.sendNotification(
      user.telegramId,
      `📢 <b>Xabar</b>\n\n${senderInfo}${message}`,
    );
  }

  async broadcastFromAdmin(message: string, sender?: any, senderUsername?: string | null): Promise<void> {
    const users = await this.userRepo.find({
      where: { telegramId: Not(IsNull()) },
      select: ['id', 'telegramId', 'fullName'],
    });

    let senderName = '';

    if (sender?.id) {
      const fullSender = await this.userRepo.findOne({
        where: { id: Number(sender.id) },
        select: ['id', 'fullName', 'username'],
      });

      senderName = fullSender?.fullName || fullSender?.username || sender.fullName || sender.username || '';
    } else if (sender?.fullName || sender?.username) {
      senderName = sender.fullName || sender.username;
    }

    const senderInfo = senderName
      ? `👤 Kimdan: <b>${senderName}</b>\n`
      : '';

    await this.saveSiteNotifications({
      recipientIds: users.map((user) => user.id),
      senderId: sender?.id ? Number(sender.id) : undefined,
      title: 'E’lon',
      message,
      type: 'BROADCAST',
    });

    for (const user of users) {
      if (!user.telegramId) continue;

      await this.sendNotification(
        user.telegramId,
        `📢 <b>E’lon</b>\n\n${senderInfo ? senderInfo + '\n' : ''}${message}`,
      );
    }
  }

  async sendNotification(telegramId: string, message: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(telegramId, message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error(`Telegram send error (${telegramId}):`, error.message);
    }
  }

  async notifyAdmins(message: string): Promise<void> {
    const admins = await this.userRepo.find({
      where: [
        { role: UserRole.ADMIN, telegramId: Not(IsNull()) },
        { role: UserRole.SUPERADMIN, telegramId: Not(IsNull()) },
      ],
      select: ['telegramId'],
    });

    for (const admin of admins) {
      if (admin.telegramId) {
        await this.sendNotification(admin.telegramId, message);
      }
    }
  }

  async notifyParentAboutAttendance(studentId: number, isPresent: boolean): Promise<void> {
    const student = await this.studentRepo.findOne({
      where: { id: studentId },
      relations: ['user', 'parent', 'parent.user'],
    });

    if (!student?.parent?.user?.telegramId) return;

    const msg =
      `📅 <b>Davomat xabari</b>\n\n` +
      `👤 O‘quvchi: <b>${student.user?.fullName ?? '—'}</b>\n` +
      `Holat: <b>${isPresent ? '✅ Keldi' : '❌ Kelmadi'}</b>`;

    await this.sendNotification(student.parent.user.telegramId, msg);
  }
}
