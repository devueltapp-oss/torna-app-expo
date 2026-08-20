/**
 * api/auth.ts — cliente de los endpoints de /auth que consumen las pantallas.
 *
 * ⚠️ El backend envuelve **toda** respuesta en `{ data, statusCode }`
 * (TransformInterceptor). Leer el JSON crudo es el error clásico: para
 * `check-username`, `json.available` es `undefined` → se interpreta como
 * "no disponible" → la pantalla marca TODOS los usernames como ocupados y el
 * botón de registrarse nunca se habilita. Este módulo desenvuelve `data`.
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

/** Formato de username que acepta el backend (`@Matches` del RegisterDto). */
export const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

/**
 * GET /auth/check-username?username= → ¿está libre?
 * No requiere autenticación. Lanza si la request falla, para que la pantalla
 * pueda distinguir "ocupado" de "no pude consultar".
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const res = await fetch(
    `${API_URL}/auth/check-username?username=${encodeURIComponent(username)}`,
  );
  if (!res.ok) throw new Error(`check-username falló: ${res.status}`);

  const json = await res.json();
  // Desenvuelve el sobre `{ data, statusCode }`; el `?? json.available` deja
  // funcionando el caso de un backend sin el interceptor.
  const available = json?.data?.available ?? json?.available;
  if (typeof available !== 'boolean') {
    throw new Error('check-username: respuesta inesperada');
  }
  return available;
}
