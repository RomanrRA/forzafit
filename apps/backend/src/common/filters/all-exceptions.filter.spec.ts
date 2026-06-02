import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AllExceptionsFilter } from './all-exceptions.filter';

function makeHost(reqOverrides: Record<string, unknown> = {}) {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const response = { status };
  const request = {
    method: 'GET',
    url: '/test',
    user: { userId: 'u1' },
    ...reqOverrides,
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('HttpException: отдаёт его статус и сообщение', () => {
    const { host, status, json } = makeHost();
    filter.catch(new NotFoundException('Не найдено'), host);

    expect(status).toHaveBeenCalledWith(404);
    const body = json.mock.calls[0][0];
    expect(body.statusCode).toBe(404);
    expect(body.message).toBe('Не найдено');
    expect(body.path).toBe('/test');
  });

  it('сохраняет массив сообщений валидации (400)', () => {
    const { host, json } = makeHost();
    filter.catch(
      new BadRequestException({ message: ['email обязателен', 'слабый пароль'] }),
      host,
    );
    const body = json.mock.calls[0][0];
    expect(body.message).toEqual(['email обязателен', 'слабый пароль']);
  });

  it('неизвестная ошибка → 500', () => {
    const { host, status, json } = makeHost();
    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(body.statusCode).toBe(500);
    // вне production сообщение не маскируется
    expect(body.message).toBe('boom');
  });

  it('работает без аутентифицированного пользователя', () => {
    const { host, status } = makeHost({ user: undefined });
    expect(() => filter.catch(new Error('boom'), host)).not.toThrow();
    expect(status).toHaveBeenCalledWith(500);
  });
});
