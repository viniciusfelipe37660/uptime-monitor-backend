import { IsIn, IsString, IsUrl, Length } from 'class-validator';

const ALLOWED_INTERVALS = [60, 300, 900] as const;

export class CreateMonitorDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsString()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @Length(1, 2048)
  url!: string;

  @IsIn(ALLOWED_INTERVALS)
  intervalSeconds!: (typeof ALLOWED_INTERVALS)[number];
}
