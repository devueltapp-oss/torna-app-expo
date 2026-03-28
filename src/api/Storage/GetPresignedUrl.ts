import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';
import {API_URL} from '@/utils/constants';

export enum FileType {
  PROFILE = 'profile',
  FRONT_PAGE = 'frontPage',
  GAME = 'game',
}

interface GeneratePresignedUrlRequest {
  type: FileType;
  filename: string;
  contentType: string;
}

interface GeneratePresignedUrlResponse {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

export const getPresignedUrl = async (
  token: string,
  data: GeneratePresignedUrlRequest,
): Promise<GeneratePresignedUrlResponse> => {
  const APIURL = `${API_URL}/storage/presigned-url`;
  
  try {
    const res = await axios.post<any>(
      APIURL,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        validateStatus: (status) => status < 500,
      },
    );
    
    // Verificar si la respuesta es un error (4xx)
    if (res.status >= 400) {
      const errorMessage = res.data?.message || res.data?.error || 'Error desconocido';
      throw new Error(`Error ${res.status}: ${errorMessage}`);
    }
    
    // El backend devuelve los datos dentro de res.data.data
    const responseData = res.data?.data || res.data;
    
    // Validar que los datos requeridos estén presentes
    if (!responseData || !responseData.uploadUrl || !responseData.publicUrl) {
      throw new Error('Respuesta inválida del servidor: faltan datos de URL presignada');
    }
    
    return {
      uploadUrl: responseData.uploadUrl,
      key: responseData.key,
      publicUrl: responseData.publicUrl,
    };
  } catch (error: any) {
    crashlytics().recordError(error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    if (error.response) {
      const errorMessage = error.response.data?.message || error.response.data?.error || 'Error desconocido';
      throw new Error(`Error al obtener URL presignada: ${error.response.status} - ${errorMessage}`);
    }
    
    throw error;
  }
};

