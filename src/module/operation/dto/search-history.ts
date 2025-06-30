import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class SearchHistoryDto {
  @IsInt()
  @Type(() => Number)
  userId: number;

  @IsOptional()
  @Type(() => Date)
  date?: Date;
}
