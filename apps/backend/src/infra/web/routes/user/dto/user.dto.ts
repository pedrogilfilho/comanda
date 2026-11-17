import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { USER_ROLES, type UserRole } from '@comanda/shared';

export class CreateUserDto {
  @IsString() @MaxLength(30) username!: string;
  @IsString() @MaxLength(80) name!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(200) password?: string;
  @IsIn([...USER_ROLES]) role!: UserRole;
}

export class SetUserActiveDto {
  @IsBoolean() active!: boolean;
}
