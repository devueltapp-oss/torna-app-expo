import {getPresignedUrl, FileType} from '@/api/Storage/GetPresignedUrl';

function base64ToUint8Array(base64: string): Uint8Array {
  const base64Data = base64.includes(',') 
    ? base64.split(',')[1] 
    : base64;
  
  // React Native no tiene atob, necesitamos decodificar manualmente
  // Tabla de caracteres base64
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  
  let bufferLength = base64Data.length * 0.75;
  if (base64Data[base64Data.length - 1] === '=') {
    bufferLength--;
    if (base64Data[base64Data.length - 2] === '=') {
      bufferLength--;
    }
  }
  
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  
  for (let i = 0; i < base64Data.length; i += 4) {
    const encoded1 = lookup[base64Data.charCodeAt(i)];
    const encoded2 = lookup[base64Data.charCodeAt(i + 1)];
    const encoded3 = lookup[base64Data.charCodeAt(i + 2)];
    const encoded4 = lookup[base64Data.charCodeAt(i + 3)];
    
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }
  
  return bytes;
}

function extractMimeType(base64: string): string {
  const match = base64.match(/data:([^;]+);base64,/);
  let mimeType = match?.[1] || 'image/jpeg';
  
  // Normalizar image/jpg a image/jpeg (el backend solo acepta image/jpeg)
  if (mimeType === 'image/jpg') {
    mimeType = 'image/jpeg';
  }
  
  // Validar que el tipo MIME sea uno de los permitidos
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(mimeType)) {
    mimeType = 'image/jpeg';
  }
  
  return mimeType;
}

function getFileExtension(mimeType: string, filename?: string): string {
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      return ext;
    }
  }
  
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  
  return mimeToExt[mimeType] || 'jpg';
}

export async function uploadImageToS3(
  token: string,
  base64Image: string,
  fileType: FileType,
  filename?: string,
): Promise<string> {
  try {
    const mimeType = extractMimeType(base64Image);
    const finalFilename = filename || `image.${getFileExtension(mimeType)}`;
    
    const {uploadUrl, publicUrl} = await getPresignedUrl(token, {
      type: fileType,
      filename: finalFilename,
      contentType: mimeType,
    });
    
    const imageBytes = base64ToUint8Array(base64Image);
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: imageBytes,
      headers: {
        'Content-Type': mimeType,
      },
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Error al subir imagen a S3:', uploadResponse.status, errorText);
      throw new Error(`Error al subir imagen: ${uploadResponse.status} - ${uploadResponse.statusText}`);
    }
    
    return publicUrl;
  } catch (error) {
    console.error('Error subiendo imagen a S3:', error);
    throw error;
  }
}

