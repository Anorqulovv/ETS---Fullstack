# Migratsiyalar

Bu papka bo'sh — birinchi ("baseline") migratsiyani **siz o'zingizning haqiqiy
production/dev bazangizga ulanib** generatsiya qilishingiz kerak, chunki:

- Sizning bazangiz hozirgacha `synchronize: true` orqali entity'lar bilan
  avtomatik sinxronlanib kelgan — ya'ni baza allaqachon barcha jadvallarni
  o'zida saqlaydi.
- Men (Claude) sizning haqiqiy bazangizga ulana olmayman, shuning uchun
  "diff"ni faqat siz, o'z muhitingizda generatsiya qila olasiz.

## ⚠️ MUHIM — ketma-ketlikka rioya qiling

**1-qadam: Avval eski kod bilan (synchronize:true) serverni oxirgi marta ishga tushiring**

Agar oxirgi paytda entity qo'shgan/o'zgartirgan bo'lsangiz (masalan
`CodingProblem`, `CodingSubmission` kabi), bazangizda bu jadvallar hali
yo'q bo'lishi mumkin. Shu o'zgarishlar kiritilgan **eski** kodni (hali
`synchronize: true` bo'lgan holatda) bir marta ishga tushirib, TypeORM
barcha jadvallarni avtomatik yaratib qo'yishiga ruxsat bering.

```bash
git stash            # yoki eski versiyani checkout qiling
npm run start:dev    # baza to'liq sinxronlansin, keyin to'xtating (Ctrl+C)
git stash pop        # yangi (synchronize:false) kodga qayting
```

**2-qadam: Boshlang'ich ("baseline") migratsiyani generatsiya qiling**

Baza allaqachon barcha entity'lar bilan mos bo'lgani uchun, bu buyruq
odatda **bo'sh yoki deyarli bo'sh** migratsiya yaratadi — bu normal holat,
maqsad shunchaki TypeORM'ning "migrations" jadvalida boshlang'ich nuqtani
belgilab qo'yish:

```bash
# .env faylida DB_URL to'g'ri sozlanganiga ishonch hosil qiling
npm run migration:generate:dev -- src/migrations/InitialSchema
```

Agar bo'sh bo'lmasa (ya'ni farq topilsa) — hosil bo'lgan faylni albatta
ochib, `up()` ichidagi SQL amallarni ko'zdan kechiring. Ayniqsa **DROP
COLUMN / DROP TABLE** kabi qatorlar bo'lsa, ular xato migratsiya emasligiga
astoydil ishonch hosil qilmaguningizcha ishga tushirmang.

**3-qadam: Migratsiyani qo'llang**

```bash
npm run build
npm run migration:run
```

**4-qadam: Shu fayllarni Git'ga commit qiling**

`src/migrations/InitialSchema-*.ts` fayli endi loyihangizning bir qismi —
uni commit qilib qo'ying.

## Keyingi safar (entity o'zgartirganingizda)

```bash
# 1. Entity faylini (masalan test.entity.ts) o'zgartiring
# 2. Migratsiya generatsiya qiling:
npm run migration:generate:dev -- src/migrations/QisqaTavsif
# 3. Hosil bo'lgan faylni ko'rib chiqing (ayniqsa DROP/ALTER qatorlarini)
# 4. Commit qiling — production'da migrationsRun:true bo'lgani uchun
#    keyingi deploy'da avtomatik qo'llanadi (yoki qo'lda: npm run migration:run)
```
