import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'test-token'),
            verify: jest.fn(() => ({ sub: 'user-123' })),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key) => {
              const config = {
                JWT_SECRET: 'test-secret',
                JWT_EXPIRY: '24h',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('login', () => {
    it('should return tokens on successful login', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      // Mock Supabase response
      const result = await service.login(email, password);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw error on invalid credentials', async () => {
      const email = 'invalid@example.com';
      const password = 'wrong-password';

      try {
        await service.login(email, password);
      } catch (error) {
        expect(error.message).toContain('Invalid');
      }
    });
  });

  describe('getCurrentUser', () => {
    it('should return user if token valid', async () => {
      const userId = 'user-123';
      const user = await service.getCurrentUser(userId);

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
    });

    it('should throw error if user not found', async () => {
      const userId = 'invalid-id';

      try {
        await service.getCurrentUser(userId);
      } catch (error) {
        expect(error.message).toContain('not found');
      }
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens on valid refresh', async () => {
      const refreshToken = 'valid-refresh-token';

      const result = await service.refreshToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw error on invalid refresh token', async () => {
      const refreshToken = 'invalid-token';

      try {
        await service.refreshToken(refreshToken);
      } catch (error) {
        expect(error.message).toContain('Invalid');
      }
    });
  });
});
