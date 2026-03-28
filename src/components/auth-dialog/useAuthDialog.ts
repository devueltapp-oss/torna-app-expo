import {useContext} from 'react';

import AuthDialogContext from './auth-dialog-context';

const useAuthDialog = () => {
  const context = useContext(AuthDialogContext);

  if (!context) {
    throw new Error('useAuthDialog must be used within an AuthDialogProvider');
  }

  return context;
};

export default useAuthDialog;
