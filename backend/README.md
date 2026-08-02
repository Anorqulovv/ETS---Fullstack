# Edu Backend — NestJS

## Arxitektura

Loyiha **bitta `UsersService`** orqali barcha rol-specific operatsiyalarni boshqaradi. Takrorlangan service/module yo'q.

```
src/modules/users/
  users.service.ts        ← Markaziy servis (create, findByRole, update, delete)
  teachers.service.ts     ← Faqat teacher-specific logika (guruh tekshirish)
  dashboard.service.ts    ← Statistika (barcha repo)
  users.controller.ts     ← SUPERADMIN: barcha userlar
  admins.controller.ts    ← /admins  → ADMIN CRUD
  teachers.controller.ts  ← /teachers → TEACHER CRUD
  supports.controller.ts  ← /supports → SUPPORT CRUD
  dto/create-user.dto.ts  ← Barcha rollar uchun umumiy DTO
  dto/update-user.dto.ts  ← Barcha rollar uchun umumiy update DTO
```

## API Endpointlar

### Auth
| Method | URL | Description |
|--------|-----|-------------|
| POST | /auth/login | Tizimga kirish |

### Users (SUPERADMIN only)
| Method | URL | Description |
|--------|-----|-------------|
| GET | /users | Barcha userlar (role filter: ?role=ADMIN) |
| GET | /users/:id | Bitta user |
| DELETE | /users/:id | User o'chirish |

### Admins
| Method | URL | Ruxsat |
|--------|-----|--------|
| POST | /admins | SUPERADMIN |
| GET | /admins | SUPERADMIN, ADMIN |
| GET | /admins/stats | SUPERADMIN, ADMIN |
| GET | /admins/:id | SUPERADMIN, ADMIN |
| PATCH | /admins/:id | SUPERADMIN |
| DELETE | /admins/:id | SUPERADMIN |

### Teachers
| Method | URL | Ruxsat |
|--------|-----|--------|
| POST | /teachers | SUPERADMIN, ADMIN |
| GET | /teachers | SUPERADMIN, ADMIN |
| GET | /teachers/my-groups | TEACHER (o'z guruhlari) |
| GET | /teachers/:id | SUPERADMIN, ADMIN |
| PATCH | /teachers/:id | SUPERADMIN, ADMIN |
| DELETE | /teachers/:id | SUPERADMIN, ADMIN |

### Supports
| Method | URL | Ruxsat |
|--------|-----|--------|
| POST | /supports | SUPERADMIN, ADMIN |
| GET | /supports | SUPERADMIN, ADMIN |
| GET | /supports/:id | SUPERADMIN, ADMIN |
| PATCH | /supports/:id | SUPERADMIN, ADMIN |
| DELETE | /supports/:id | SUPERADMIN, ADMIN |

### Students
| Method | URL | Ruxsat | Tavsif |
|--------|-----|--------|--------|
| POST | /students | SUPERADMIN, ADMIN, TEACHER | Body: `{ user: {...}, student: {...} }` |
| POST | /students/link-user | SUPERADMIN, ADMIN | Mavjud userni student qilish |
| GET | /students | SUPERADMIN, ADMIN, TEACHER, SUPPORT | Teacher faqat o'z guruhi |
| GET | /students/:id | SUPERADMIN, ADMIN, TEACHER, SUPPORT | |
| PATCH | /students/:id | SUPERADMIN, ADMIN, TEACHER | |
| DELETE | /students/:id | SUPERADMIN, ADMIN | User ham o'chadi |

### Parents
| Method | URL | Ruxsat | Tavsif |
|--------|-----|--------|--------|
| POST | /parents | SUPERADMIN, ADMIN | Body: user ma'lumotlari (parent user+profil bir vaqtda) |
| POST | /parents/link-user | SUPERADMIN, ADMIN | Mavjud userni parent qilish |
| GET | /parents | SUPERADMIN, ADMIN, SUPPORT | |
| GET | /parents/my-children | PARENT | O'z farzandlari |
| GET | /parents/:id | SUPERADMIN, ADMIN, SUPPORT | |
| PATCH | /parents/:id | SUPERADMIN, ADMIN | |
| DELETE | /parents/:id | SUPERADMIN, ADMIN | User ham o'chadi |

### Groups, Attendance, Tests, Directions
Avvalgidek ishlaydi.

## Student yaratish misoli

```json
POST /students
{
  "user": {
    "fullName": "Alisher Karimov",
    "username": "alisher_k",
    "phone": "+998901234567",
    "password": "password123"
  },
  "student": {
    "cardId": "CARD001",
    "groupId": 1
  }
}
```

## .env namunasi

```env
DB_URL=postgresql://user:password@localhost:5432/edu_db
JWT_SECRET=your_jwt_secret
SUPERADMIN_USERNAME=superadmin
SUPERADMIN_PHONE=+998901234567
SUPERADMIN_PASSWORD=SuperPass123!
TELEGRAM_BOT_TOKEN=your_token
```

## O'zgarishlar (Refactoring)

- ❌ `src/admin/` — o'chirildi → `src/modules/users/admins.controller.ts`
- ❌ `src/modules/teacher/` — o'chirildi → `src/modules/users/teachers.controller.ts`
- ❌ `src/modules/support/` — stub edi, o'chirildi → `src/modules/users/supports.controller.ts`
- ✅ Bitta `UsersService` — barcha rol CRUD uchun markaziy manba
- ✅ Bitta `CreateUserDto` / `UpdateUserDto` — takrorlangan DTOlar yo'q
- ✅ Student va Parent: `createWithUser` — bir API call bilan user+profil
- ✅ Student to'liq CRUD (oldin faqat create/read bor edi)
- ✅ Support to'liq CRUD (oldin stub edi)
