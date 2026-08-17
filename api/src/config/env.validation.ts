import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsString, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  API_PORT: number = 3001;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  DIRECT_URL: string;

  @IsString()
  NEXT_PUBLIC_SUPABASE_URL: string;

  @IsString()
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;

  @IsString()
  SUPABASE_SERVICE_ROLE_KEY: string;

  @IsString()
  JWT_SECRET: string;

  @IsNumber()
  JWT_EXPIRATION: number = 900;

  @IsNumber()
  REFRESH_TOKEN_EXPIRATION: number = 604800;

  @IsString()
  REDIS_URL: string = 'redis://localhost:6379';

  @IsString()
  LOG_LEVEL: string = 'debug';

  @IsString()
  CORS_ORIGIN: string = 'http://localhost:3000';
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Config validation error:\n${errors.toString()}`);
  }

  return validatedConfig;
}
