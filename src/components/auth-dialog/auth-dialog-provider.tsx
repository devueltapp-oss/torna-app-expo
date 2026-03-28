import {useState} from 'react';

import AuthDialogContext from './auth-dialog-context';

export type AuthDialogProviderProps = {
  children: React.ReactNode;
};

const AuthDialogProvider = ({children}: AuthDialogProviderProps) => {
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const toggleAuthDialog = () => setShowAuthDialog(!showAuthDialog);
  const openAuthDialog = () => setShowAuthDialog(true);
  const closeAuthDialog = () => setShowAuthDialog(false);

  return (
    <AuthDialogContext.Provider
      value={{
        show: showAuthDialog,
        toggle: toggleAuthDialog,
        close: closeAuthDialog,
        open: openAuthDialog,
      }}>
      {children}
    </AuthDialogContext.Provider>
  );
};

export default AuthDialogProvider;
