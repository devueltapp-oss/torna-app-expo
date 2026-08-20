/**
 * `checkUsernameAvailable` — el eslabón que rompía el alta de usuarios.
 *
 * El backend envuelve todo en `{ data, statusCode }`. Las pantallas leían
 * `json.available` (undefined) y lo trataban como "no disponible", así que
 * TODOS los usernames salían ocupados y el botón de registrarse nunca se
 * habilitaba. Este test fija el desenvuelto.
 */
import { checkUsernameAvailable } from '../auth';

describe('checkUsernameAvailable (GET /auth/check-username)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  function mockJson(body: unknown, ok = true, status = 200) {
    const fetchMock = jest.fn(async () => ({ ok, status, json: async () => body }));
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  }

  it('desenvuelve el sobre { data, statusCode } del backend', async () => {
    mockJson({ data: { available: true }, statusCode: 200 });
    await expect(checkUsernameAvailable('raulsncz')).resolves.toBe(true);
  });

  it('devuelve false cuando el username ya existe', async () => {
    mockJson({ data: { available: false }, statusCode: 200 });
    await expect(checkUsernameAvailable('tomado')).resolves.toBe(false);
  });

  it('tolera una respuesta sin sobre (backend sin interceptor)', async () => {
    mockJson({ available: true });
    await expect(checkUsernameAvailable('plano')).resolves.toBe(true);
  });

  it('escapa el username en la query', async () => {
    const fetchMock = mockJson({ data: { available: true } });
    await checkUsernameAvailable('a b&c');
    expect(fetchMock.mock.calls[0][0]).toContain('username=a%20b%26c');
  });

  it('lanza si la request falla — "no pude consultar" no es "ocupado"', async () => {
    mockJson({}, false, 500);
    await expect(checkUsernameAvailable('x')).rejects.toThrow();
  });

  it('lanza si la respuesta no trae un booleano', async () => {
    mockJson({ data: {} });
    await expect(checkUsernameAvailable('x')).rejects.toThrow();
  });
});
