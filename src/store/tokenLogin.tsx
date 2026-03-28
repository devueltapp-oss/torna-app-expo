import {create} from 'zustand';

interface DataUser {
  dataUser: any[];
  token: string;
  setDataUser: (dataUser: any[]) => void;
  setToken: (token: string) => void;
}

export const tokenLogin = create<DataUser>(set => ({
  dataUser: [],
  token: '', // Estado inicial para token (cadena vacía)
  setDataUser: dataUser => set({dataUser}), // Función para actualizar user
  setToken: token => set({token}), // Función para actualizar token
}));
