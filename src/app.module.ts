import { Controller, Get, Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { CardModule } from './card/card.module';
import { PrismaService } from './database/prisma.service';

@Controller()
class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('health')
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}

@Module({
  imports: [CardModule, GraphQLModule.forRoot<ApolloDriverConfig>({
    driver: ApolloDriver,
    autoSchemaFile: true,
    sortSchema: true,
    playground: false,
    introspection: true,
    csrfPrevention: true,
    allowBatchedHttpRequests: false,
    includeStacktraceInErrorResponses: false,
    maxRecursiveSelections: 1000,
    plugins: [ApolloServerPluginLandingPageLocalDefault({ embed: true })]
  })],
  controllers: [HealthController]
})
export class AppModule {}
