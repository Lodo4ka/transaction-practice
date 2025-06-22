import { IsInt, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateOperationDto {
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount: number;

  @IsNumber()
  @IsNotEmpty()
  @IsInt()
  senderId: number;

  @IsNumber()
  @IsNotEmpty()
  @IsInt()
  receiverId: number;
}
