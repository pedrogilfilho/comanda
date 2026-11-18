import { IsInt, Max, Min } from 'class-validator';
import { MAX_TOTAL_TABLES } from '@comanda/shared';

const RANGE = `O total de mesas vai de 1 a ${MAX_TOTAL_TABLES}`;

export class UpdateSettingsDto {
  @IsInt({ message: 'O total de mesas precisa ser um número inteiro' })
  @Min(1, { message: RANGE })
  @Max(MAX_TOTAL_TABLES, { message: RANGE })
  totalTables!: number;
}
