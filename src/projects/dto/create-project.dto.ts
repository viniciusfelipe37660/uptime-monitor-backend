import { IsString, Length, Matches } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsString()
  @Length(3, 50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers and dashes',
  })
  slug!: string;
}
