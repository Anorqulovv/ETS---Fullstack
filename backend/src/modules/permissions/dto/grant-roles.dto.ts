import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum } from 'class-validator';
import { UserRole } from 'src/common/enums/role.enum';

export class GrantRolesDto {
  @ApiProperty({
    enum: UserRole,
    isArray: true,
    example: [UserRole.TEACHER],
    description:
      "Foydalanuvchiga qo'shimcha beriladigan rol huquqlari (asosiy 'role'ini o'zgartirmaydi, faqat shu rollarga tegishli @AccessRoles tekshiruvlaridan o'tkazadi)",
  })
  @IsArray()
  @IsEnum(UserRole, { each: true })
  grantedRoles: UserRole[];
}
