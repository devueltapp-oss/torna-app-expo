/**
 * Confirma que el cliente de API convierte un highlight privado en público
 * pegándole al endpoint correcto del backend.
 *
 * Cadena bajo test: app → `PATCH /highlights/:id/toggle` (el backend invierte
 * `isEnabled`, la visibilidad). Es el eslabón "desde la app" que dispara el
 * cambio de privado a público.
 */
import { toggleHighlightVisibility } from '../highlights';

describe('toggleHighlightVisibility (PATCH /highlights/:id/toggle)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('hace PATCH al endpoint de toggle con el Bearer token', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await toggleHighlightVisibility('h1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/highlights/h1/toggle');
    expect(init.method).toBe('PATCH');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer test-token',
    );
  });

  it('lanza (con status) si el backend rechaza — p. ej. no-dueño → 403', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 403,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    await expect(toggleHighlightVisibility('h1')).rejects.toMatchObject({
      status: 403,
    });
  });
});
