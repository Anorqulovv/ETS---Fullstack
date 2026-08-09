export enum ProblemDifficulty {
  SIMPLE = 'SIMPLE', // sodda tekshirish — faqat natija to'g'ri/noto'g'ri
  MEDIUM = 'MEDIUM', // o'rta tekshirish — natija + asosiy edge case'lar + kod tuzilishi
  DEEP = 'DEEP', // chuqur tekshirish — to'liq test-case simulyatsiyasi + murakkablik tahlili
}

export enum CodingSubmissionStatus {
  PENDING = 'PENDING',
  CHECKING = 'CHECKING',
  CHECKED = 'CHECKED',
  FAILED = 'FAILED',
}
