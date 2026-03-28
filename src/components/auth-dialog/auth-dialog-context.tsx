import {createContext} from 'react';

export type AuthDialogContextType = {
  show: boolean;
  toggle: () => void;
  close: () => void;
  open: () => void;
};

const AuthDialogContext = createContext<AuthDialogContextType>({
  show: false,
  toggle: () => {},
  close: () => {},
  open: () => {},
});

export default AuthDialogContext;
