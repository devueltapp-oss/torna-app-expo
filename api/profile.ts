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
 *
 * Nota de producto: la ÚNICA imagen subible desde la app es la del usuario
 * (avatar/portada). El resto del contenido son highlights creados en la app.
 */
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const TOKEN_KEY = 'torna_auth_token';

async function getToken(): Promise<string> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) throw new Error('Usuario no autenticado');
  return token;
}

/**
 * Camino directo: presigned PUT cliente→B2. Devuelve la URL pública del objeto.
 * Lanza si falla en cualquier paso.
 */
async function presignedPutToB2(
  key: string,
  mime: string,
  assetUri: string,
  token: string,
): Promise<string> {
  // 1. Presigned URL de B2
  const urlEndpoint = `${API_URL}/files/upload-url?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(mime)}`;
  const urlRes = await fetch(urlEndpoint, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!urlRes.ok) {
    throw new Error('No se pudo obtener la URL de subida.');
  }
  // El backend envuelve las respuestas en { data, statusCode }; desenvolver.
  const json = (await urlRes.json()) as {
    data?: { uploadUrl: string; publicUrl: string };
    uploadUrl?: string;
    publicUrl?: string;
  };
  const { uploadUrl, publicUrl } = json.data ?? json;
  if (!uploadUrl || !publicUrl) {
    throw new Error('Respuesta inesperada del servidor de subida.');
  }

  // 2. Subir el archivo directo a B2 (binary, leído del disco).
  let putRes: FileSystem.FileSystemUploadResult;
  try {
    putRes = await FileSystem.uploadAsync(uploadUrl, assetUri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { 'Content-Type': mime },
    });
  } catch (e) {
    throw new Error('No se pudo subir la imagen a B2 (excepción de red).');
  }
  if (putRes.status < 200 || putRes.status >= 300) {
    throw new Error(
      `No se pudo subir la imagen. B2 respondió ${putRes.status}: ${putRes.body ?? ''}`,
    );
  }

  return publicUrl;
}

/**
 * Fallback: la app manda el archivo al backend (multipart) y el backend lo sube
 * a B2. Se usa cuando el PUT directo a B2 falla. Devuelve la URL pública.
 */
async function backendUploadToB2(
  key: string,
  mime: string,
  assetUri: string,
  token: string,
): Promise<string> {
  const endpoint = `${API_URL}/files/upload?key=${encodeURIComponent(key)}`;
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
    throw new Error('No se pudo subir la imagen (fallback backend, excepción de red).');
  }
  if (res.status < 200 || res.status >= 300) {
    throw new Error(
      `No se pudo subir la imagen vía backend. Respondió ${res.status}: ${res.body ?? ''}`,
    );
  }
  // El backend devuelve { data: { key, publicUrl }, statusCode } (envelope).
  let publicUrl: string | undefined;
  try {
    const parsed = JSON.parse(res.body ?? '{}');
    publicUrl = (parsed.data ?? parsed)?.publicUrl;
  } catch {
    /* body no-JSON → publicUrl queda undefined */
  }
  if (!publicUrl) {
    throw new Error('No se pudo obtener la URL pública de la imagen subida.');
  }
  return publicUrl;
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

  // Verificar que el archivo local existe (causa común de fallo).
  const info = await FileSystem.getInfoAsync(assetUri);
  if (!info.exists) throw new Error(`El archivo local no existe: ${assetUri}`);

  // Intentar directo a B2; si falla, fallback vía backend. El publicUrl lo
  // devuelve el backend (no se hardcodea host/bucket).
  try {
    return await presignedPutToB2(key, mime, assetUri, token);
  } catch {
    return await backendUploadToB2(key, mime, assetUri, token);
  }
}

/** Persiste un campo de imagen del usuario vía PATCH /user/me. */
async function patchMe(
  patch: Record<string, string>,
  token: string,
  errorMsg: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/user/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(errorMsg);
  }
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
