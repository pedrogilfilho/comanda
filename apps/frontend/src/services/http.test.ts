import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, errorMessage, http, isApiError, tokenStore } from './http';

// Espera a promessa falhar e devolve o erro já tipado
const fail = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error('esperava erro');
    },
    (e) => e as ApiError,
  );

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('http', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('manda o token e o corpo em JSON', async () => {
    tokenStore.set('abc');
    fetchMock.mockResolvedValue(json(200, { ok: true }));

    const res = await http.post<{ ok: boolean }>('/tables/open', { identifier: '5' });

    expect(res).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/tables\/open$/);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer abc');
    expect(JSON.parse(init.body)).toEqual({ identifier: '5' });
  });

  it('rota pública não manda token', async () => {
    tokenStore.set('abc');
    fetchMock.mockResolvedValue(json(200, {}));
    await http.post('/auth/login', { username: 'a', password: 'b' }, { auth: false });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('transforma o corpo de erro em ApiError com o código do backend', async () => {
    fetchMock.mockResolvedValue(
      json(409, { statusCode: 409, code: 'STOCK_INSUFFICIENT', message: 'Estoque insuficiente de Picanha' }),
    );

    const error = await fail(http.post('/orders', {}));

    expect(error).toBeInstanceOf(ApiError);
    expect(isApiError(error, 'STOCK_INSUFFICIENT')).toBe(true);
    expect(error.status).toBe(409);
    expect(errorMessage(error, 'x')).toBe('Estoque insuficiente de Picanha');
  });

  it('junta mensagens em lista (erros de validação)', async () => {
    fetchMock.mockResolvedValue(
      json(400, { statusCode: 400, code: 'VALIDATION', message: ['campo a', 'campo b'] }),
    );
    const error = await fail(http.get('/x'));
    expect(error.message).toBe('campo a. campo b');
  });

  it('401 numa rota autenticada limpa o token', async () => {
    tokenStore.set('vencido');
    fetchMock.mockResolvedValue(
      json(401, { statusCode: 401, code: 'UNAUTHORIZED', message: 'Sessão expirada' }),
    );

    await expect(http.get('/tables')).rejects.toBeInstanceOf(ApiError);
    expect(tokenStore.get()).toBeNull();
  });

  it('401 no login não mexe na sessão (é senha errada)', async () => {
    tokenStore.set('outro');
    fetchMock.mockResolvedValue(
      json(401, { statusCode: 401, code: 'UNAUTHORIZED', message: 'Usuário ou senha incorretos' }),
    );

    const error = await fail(http.post('/auth/login', {}, { auth: false }));
    expect(error.message).toBe('Usuário ou senha incorretos');
    expect(tokenStore.get()).toBe('outro');
  });

  it('falha de rede vira código NETWORK', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const error = await fail(http.get('/tables'));
    expect(isApiError(error, 'NETWORK')).toBe(true);
  });

  it('429 sem corpo vira RATE_LIMITED', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 429 }));
    const error = await fail(http.post('/auth/login', {}, { auth: false }));
    expect(error.code).toBe('RATE_LIMITED');
  });

  it('204 devolve undefined', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(http.delete('/products/1')).resolves.toBeUndefined();
  });
});
