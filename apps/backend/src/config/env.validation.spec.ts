import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.validation';

const base = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
  JWT_SECRET: '0123456789abcdef',
  JWT_REFRESH_SECRET: 'fedcba9876543210',
};

describe('validateEnv', () => {
  it('пропускает валидный конфиг', () => {
    expect(() => validateEnv(base)).not.toThrow();
  });

  it('приводит PORT из строки к числу', () => {
    const result = validateEnv({ ...base, PORT: '3001' });
    expect(result.PORT).toBe(3001);
    expect(typeof result.PORT).toBe('number');
  });

  it('бросает, если отсутствует DATABASE_URL', () => {
    const { DATABASE_URL: _omit, ...rest } = base;
    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it('бросает, если JWT_SECRET короче 16 символов', () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: 'short' })).toThrow(
      /JWT_SECRET/,
    );
  });

  it('бросает на некорректный NODE_ENV', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV/,
    );
  });

  it('принимает валидный NODE_ENV', () => {
    expect(() =>
      validateEnv({ ...base, NODE_ENV: 'production' }),
    ).not.toThrow();
  });

  it('не требует опциональные SMTP/AI переменные', () => {
    const result = validateEnv(base);
    expect(result.SMTP_HOST).toBeUndefined();
    expect(result.OPENROUTER_API_KEY).toBeUndefined();
  });
});
