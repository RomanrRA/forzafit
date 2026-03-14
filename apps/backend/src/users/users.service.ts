import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import { users } from '../db/schema';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private drizzle: DrizzleService) {}

  async findById(id: string) {
    const [user] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const [user] = await this.drizzle.db
      .update(users)
      .set({
        ...(dto.name !== undefined     && { name: dto.name }),
        ...(dto.gender !== undefined   && { gender: dto.gender }),
        ...(dto.dob !== undefined      && { dob: new Date(dto.dob) }),
        ...(dto.heightCm !== undefined && { heightCm: dto.heightCm }),
        ...(dto.weightKg !== undefined && { weightKg: dto.weightKg }),
        ...(dto.goal !== undefined     && { goal: dto.goal }),
        ...(dto.appMode !== undefined  && { appMode: dto.appMode }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  async deleteAccount(id: string): Promise<void> {
    await this.drizzle.db.delete(users).where(eq(users.id, id));
  }
}
