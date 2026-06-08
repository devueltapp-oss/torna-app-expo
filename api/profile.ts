/**
 * Subida de imágenes del usuario a Backblaze B2.
 *
 * Dos imágenes persisten en el usuario (campos sueltos en el backend):
 *   - profilePicture (avatar)  → uploadProfilePicture()
 *   - frontPage (portada)      → uploadFrontPage()
 *
 * Flujo (presigned, cliente→B2) para ambas:
 *   1. GET /files/upload-url → presigned PUT de Backblaze B2
 *   2. PUT del archivo directo a B2  (expo-file-system, binary)
 *   3. PATCH /user/me { profilePicture | frontPage: <url pública> }
 *
 * ⚠️ Por qué expo-file-system y no fetch().blob():
 *   En React Native, `await fetch(fileUri).then(r => r.blob())` sobre un
 *   `file://` local devuelve un Blob que NO sube bien (se envía vacío / 0 bytes
 *   o con headers que rompen la firma de B2). `FileSystem.uploadAsync` con
 *   `BINARY_CONTENT` lee el archivo del disco y hace el PUT crudo — esta es la
 *   forma correcta y confiable de subir directo a B2 desde el dispositivo.
 */
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const TOKEN_KEY = 'torna_auth_token';
// Mismo bucket público que usa el resto de la media de la app.
const B2_PUBLIC_BASE = 'https://f005.backblazeb2.com/file/torna-videos';

// ─────────────────────────────────────────────────────────────────────────
// TODO(dev): QUITAR antes de producción. Logging temporal para diagnosticar
// la subida de foto de perfil a B2. Buscar "[UPLOAD DEBUG]" para borrar todo.
// ─────────────────────────────────────────────────────────────────────────
function dbg(...args: unknown[]) {
  if (__DEV__) console.log('[UPLOAD DEBUG]', ...args);
}

async function getToken(): Promise<string> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) throw new Error('Usuario no autenticado');
  return token;
}

/**
 * Camino directo: presigned PUT cliente→B2. Lanza si falla en cualquier paso.
 */
async function presignedPutToB2(
  key: string,
  mime: string,
  assetUri: string,
  token: string,
): Promise<void> {
  // 1. Presigned URL de B2
  const urlEndpoint = `${API_URL}/files/upload-url?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(mime)}`;
  dbg('GET presigned url ->', urlEndpoint);
  const urlRes = await fetch(urlEndpoint, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!urlRes.ok) {
    const body = await urlRes.text().catch(() => '');
    dbg('presigned url FALLÓ', urlRes.status, body);
    throw new Error('No se pudo obtener la URL de subida.');
  }
  const { uploadUrl } = (await urlRes.json()) as { uploadUrl: string };
  dbg('presigned url OK', uploadUrl.slice(0, 120) + '…');

  // 2. Subir el archivo directo a B2 (binary, leído del disco).
  let putRes: FileSystem.FileSystemUploadResult;
  try {
    putRes = await FileSystem.uploadAsync(uploadUrl, assetUri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { 'Content-Type': mime },
    });
  } catch (e) {
    dbg('PUT a B2 lanzó excepción', e);
    throw new Error('No se pudo subir la imagen a B2 (excepción de red).');
  }
  dbg('PUT a B2 respuesta', { status: putRes.status, body: putRes.body?.slice(0, 300) });
  if (putRes.status < 200 || putRes.status >= 300) {
    throw new Error(
      `No se pudo subir la imagen. B2 respondió ${putRes.status}: ${putRes.body ?? ''}`,
    );
  }
}

/**
 * Fallback: la app manda el archivo al backend (multipart) y el backend lo sube
 * a B2. Se usa cuando el PUT directo a B2 falla.
 */
async function backendUploadToB2(
  key: string,
  mime: string,
  assetUri: string,
  token: string,
): Promise<void> {
  const endpoint = `${API_URL}/files/upload?key=${encodeURIComponent(key)}`;
  dbg('POST fallback backend ->', endpoint);
  let res: FileSystem.FileSystemUploadResult;
  try {
    res = await FileSystem.uploadAsync(endpoint, assetUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: mime,
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    dbg('POST fallback lanzó excepción', e);
    throw new Error('No se pudo subir la imagen (fallback backend, excepción de red).');
  }
  dbg('POST fallback respuesta', { status: res.status, body: res.body?.slice(0, 300) });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(
      `No se pudo subir la imagen vía backend. Respondió ${res.status}: ${res.body ?? ''}`,
    );
  }
}

/**
 * Sube una imagen a B2 y devuelve su URL pública. Intenta el camino directo
 * (presigned PUT cliente→B2) y, si falla, hace fallback app→backend→B2.
 * `folder` es el prefijo del key en el bucket (p. ej. 'avatars', 'covers').
 */
async function uploadImageToB2(
  folder: string,
  uid: string,
  assetUri: string,
  token: string,
): Promise<string> {
  const ext = assetUri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  const key = `${folder}/${uid}-${Date.now()}.${ext}`;

  dbg('inicio', { folder, uid, assetUri, ext, mime, key, apiUrl: API_URL });

  // 0. Verificar que el archivo local existe y tiene tamaño (causa común de fallo).
  try {
    const info = await FileSystem.getInfoAsync(assetUri);
    dbg('archivo local', info);
    if (!info.exists) throw new Error(`El archivo local no existe: ${assetUri}`);
  } catch (e) {
    dbg('error leyendo archivo local', e);
    throw e;
  }

  // 1. Intentar directo a B2; si falla, fallback vía backend.
  try {
    await presignedPutToB2(key, mime, assetUri, token);
    dbg('camino directo OK');
  } catch (directErr) {
    dbg('camino directo FALLÓ, intentando fallback backend', directErr);
    await backendUploadToB2(key, mime, assetUri, token);
    dbg('camino fallback backend OK');
  }

  // 2. URL pública (misma key en ambos caminos).
  const publicUrl = `${B2_PUBLIC_BASE}/${key}`;
  dbg('subida OK, url pública', publicUrl);
  return publicUrl;
}

/** Persiste un campo de imagen del usuario vía PATCH /user/me. */
async function patchMe(
  patch: Record<string, string>,
  token: string,
  errorMsg: string,
): Promise<void> {
  dbg('PATCH /user/me', patch);
  const res = await fetch(`${API_URL}/user/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    dbg('PATCH /user/me FALLÓ', res.status, body);
    throw new Error(errorMsg);
  }
  dbg('PATCH /user/me OK');
}

/** Foto de perfil (avatar). Sube a B2 y persiste en profilePicture. */
export async function uploadProfilePicture(uid: string, assetUri: string): Promise<string> {
  const token = await getToken();
  const url = await uploadImageToB2('avatars', uid, assetUri, token);
  await patchMe({ profilePicture: url }, token, 'No se pudo guardar la foto de perfil.');
  return url;
}

/** Foto de portada. Sube a B2 y persiste en frontPage. */
export async function uploadFrontPage(uid: string, assetUri: string): Promise<string> {
  const token = await getToken();
  const url = await uploadImageToB2('covers', uid, assetUri, token);
  await patchMe({ frontPage: url }, token, 'No se pudo guardar la foto de portada.');
  return url;
}
