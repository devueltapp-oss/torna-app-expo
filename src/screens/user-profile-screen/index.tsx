import {SafeAreaView} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useState} from 'react';

import CustomHeader from '@/components/header/CustomHeader';
import ProfileView from '@/components/profile-view';
import {MainNavigatorParamList} from '@/navigators/main-navigator';
import {UserResponse} from '@/config/types';

export function UserProfileScreen(
  props: NativeStackScreenProps<MainNavigatorParamList, 'screens.userProfile'>,
) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [isFollowing, setIsFollowing] = useState<boolean | undefined>();

  const userDataCallback = (data: UserResponse) => {
    setTitle(data.name);
    setIsFollowing(data.following);
  };

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
        textBack={title ? '' : 'Regresar'}
        textCenter={title}
        showNotificationIcon={false}
        showProfileIcon={false}
        showLogaout={false}
        showEditProfileIcon={false}
      />
      <ProfileView
        userId={props.route.params.userId}
        showEditProfileButton={false}
        userDataCallback={userDataCallback}
        showFollowButton={true}
        isFollowing={isFollowing}
        isOwnProfile={false}
      />
    </SafeAreaView>
  );
}
