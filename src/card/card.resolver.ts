import { Query, Resolver } from '@nestjs/graphql';
import { Profile } from './card.models';
import { CardService } from './card.service';

@Resolver(() => Profile)
export class CardResolver {
  constructor(private readonly card: CardService) {}

  @Query(() => Profile, { nullable: true, description: 'Public digital business card. Null if the profile has not been seeded.' })
  profile() { return this.card.getProfile(); }
}
