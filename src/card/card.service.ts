import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CardService {
  constructor(private readonly prisma: PrismaService) {}

  getProfile() {
    // One bounded card, loaded with one SQL query, including all nested lists.
    return this.prisma.profile.findUnique({
      where: { id: 'stepan' },
      relationLoadStrategy: 'join',
      include: {
        links: { orderBy: { sortOrder: 'asc' } },
        skills: { orderBy: { sortOrder: 'asc' } },
        experience: { orderBy: { sortOrder: 'asc' } },
        projects: { orderBy: { sortOrder: 'asc' } }
      }
    });
  }
}
