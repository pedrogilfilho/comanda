import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString() @MinLength(1) @MaxLength(60) username!: string;
  @IsString() @MinLength(1) @MaxLength(200) password!: string;
}

export class ChangePasswordDto {
  @IsString() @MaxLength(200) newPassword!: string;
  @IsOptional() @IsString() @MaxLength(200) currentPassword?: string;
}

export class VerifyTwoFactorDto {
  @IsString() @MinLength(10) challengeToken!: string;
  @IsString() @MinLength(6) @MaxLength(9) code!: string;
}

export class SetupTwoFactorDto {
  @IsOptional() @IsString() challengeToken?: string;
}

export class TwoFactorCodeDto {
  @IsString() @MinLength(6) @MaxLength(9) code!: string;
  @IsOptional() @IsString() challengeToken?: string;
}
