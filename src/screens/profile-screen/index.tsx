import {SafeAreaView} from '@gluestack-ui/themed';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '@/contexts/authContext';
import {getApiProfileData} from '@/api/Profile/GetAPiProfile';
import CustomHeader from '@/components/header/CustomHeader';
import ProfileView from '@/components/profile-view';
import { Spinner } from '@/components/Spinner';

const ProfileScreen = () => {
  const {firebaseUser} = useAuth();
  const insets = useSafeAreaInsets();

  const containerStyles = {
    flex: 1,
    // Paddings to handle safe area
    paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
    paddingBottom: insets.bottom,
  };

  return (
    <SafeAreaView style={containerStyles}>
      <CustomHeader
        boolImageTorna={false}
        textCenter={'Perfil'}
        showNotificationIcon={false}
        showProfileIcon={false}
        showLogaout={true}
      />
      {
        !firebaseUser && <Spinner />
      }
      {
        firebaseUser && <ProfileView
          userId={firebaseUser.uid}
          getUserData={getApiProfileData}
          showEditProfileButton={true}
        />
      }
    </SafeAreaView>
  );
};

export default ProfileScreen;
