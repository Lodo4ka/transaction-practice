import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getBalance(id: string): Promise<number | null> {
    const userId = parseInt(id);
    const user = await this.userRepository.getUserById(userId);
    return user?.balance.toNumber() ?? null;
  }
}
