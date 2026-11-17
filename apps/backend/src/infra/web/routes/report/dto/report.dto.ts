import { IsOptional, Matches } from 'class-validator';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Período inclusivo em AAAA-MM-DD (horário de Brasília); sem valores = hoje
export class DateRangeDto {
  @IsOptional() @Matches(DAY, { message: 'from deve estar no formato AAAA-MM-DD' }) from?: string;
  @IsOptional() @Matches(DAY, { message: 'to deve estar no formato AAAA-MM-DD' }) to?: string;
}

export class LogsQueryDto extends DateRangeDto {
  @IsOptional() @Matches(/^[A-Z_]{3,40}$/) action?: string;
}
