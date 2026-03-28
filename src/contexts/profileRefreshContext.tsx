import React, {createContext, useContext, useState, ReactNode} from 'react';

interface ProfileRefreshContextType {
  shouldRefreshProfile: boolean;
  triggerProfileRefresh: () => void;
  clearProfileRefresh: () => void;
}

const ProfileRefreshContext = createContext<ProfileRefreshContextType | undefined>(undefined);

interface ProfileRefreshProviderProps {
  children: ReactNode;
}

export function ProfileRefreshProvider({children}: ProfileRefreshProviderProps) {
  const [shouldRefreshProfile, setShouldRefreshProfile] = useState(false);

  const triggerProfileRefresh = () => {
    console.log('🔄 Triggering profile refresh');
    setShouldRefreshProfile(true);
  };

  const clearProfileRefresh = () => {
    console.log('✅ Clearing profile refresh flag');
    setShouldRefreshProfile(false);
  };

  return (
    <ProfileRefreshContext.Provider
      value={{
        shouldRefreshProfile,
        triggerProfileRefresh,
        clearProfileRefresh,
      }}>
      {children}
    </ProfileRefreshContext.Provider>
  );
}

export function useProfileRefresh() {
  const context = useContext(ProfileRefreshContext);
  if (context === undefined) {
    throw new Error('useProfileRefresh must be used within a ProfileRefreshProvider');
  }
  return context;
}






