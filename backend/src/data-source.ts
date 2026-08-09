import 'dotenv/config';
import { DataSource } from 'typeorm';

// TypeORM CLI uchun mustaqil (standalone) DataSource konfiguratsiyasi.
//
// MUHIM: bu fayl NestJS ilovasi ichida ISHLATILMAYDI — u faqat `typeorm` CLI
// buyruqlari (`migration:generate`, `migration:run`, `migration:revert`) uchun.
// Runtime'da ilova hali ham `app.module.ts`dagi `TypeOrmModule.forRoot(...)`
// orqali ulanadi. Ikkalasi bir xil bazaga ulanishi uchun bir xil `DB_URL`
// ishlatiladi — shu sabab entity/migratsiya ro'yxati ikkalasida ham izchil
// bo'lishi kerak (pastiga qarang).
//
// Ishlatish (package.json'dagi tayyor scriptlar orqali):
//   npm run build                     # avval TS -> dist ga kompilyatsiya qilinadi
//   npm run migration:generate -- src/migrations/InitialSchema
//   npm run migration:run
//   npm run migration:revert
const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DB_URL,
  // Diqqat: bu yerda ATAYLAB `synchronize` yo'q — CLI hech qachon bazani
  // avtomatik moslashtirmasligi kerak, faqat aniq yozilgan migratsiyalar orqali.
  entities: [
    // Kompilyatsiya qilingan (dist) va xom (ts-node orqali ishga tushirilganda
    // ham ishlashi uchun) ikkala holatni ham qamrab oladi.
    __dirname + '/databases/entities/*.entity{.ts,.js}',
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
});

export default AppDataSource;
