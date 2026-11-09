import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ProfessionalLink {
  @Field(() => ID) id!: string;
  @Field() label!: string;
  @Field() url!: string;
}

@ObjectType()
export class Skill {
  @Field(() => ID) id!: string;
  @Field() name!: string;
}

@ObjectType()
export class Experience {
  @Field(() => ID) id!: string;
  @Field() company!: string;
  @Field() position!: string;
  @Field() period!: string;
  @Field(() => [String]) achievements!: string[];
}

@ObjectType()
export class Project {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field() description!: string;
  @Field(() => String, { nullable: true, description: 'Null when no public project URL is available.' }) link!: string | null;
}

@ObjectType()
export class Profile {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field() description!: string;
  @Field(() => [ProfessionalLink]) links!: ProfessionalLink[];
  @Field(() => [Skill]) skills!: Skill[];
  @Field(() => [Experience]) experience!: Experience[];
  @Field(() => [Project]) projects!: Project[];
}
