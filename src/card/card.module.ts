import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CardResolver } from './card.resolver';
import { CardService } from './card.service';

@Module({ providers: [PrismaService, CardService, CardResolver], exports: [PrismaService] })
export class CardModule {}
