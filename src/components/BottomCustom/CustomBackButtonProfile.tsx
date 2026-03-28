/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {TouchableOpacity, Dimensions, StyleSheet, View} from 'react-native';
import {Text} from '@gluestack-ui/themed';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import LogOutIcon from '@/assets/icons/log-out-icon';
import {MainNavigatorParamList} from '@/navigators/main-navigator';
import {logOut} from '@/firebase/auth';
import ComeBack from '@/assets/icons/come-back-icon';

const {height: SCREEN_HEIGHT} = Dimensions.get('window'); // Obtener dimensiones de la pantalla

type NavigationProp = NativeStackNavigationProp<MainNavigatorParamList>;

const CustomBackButtonProfile = ({show, textCenter}: any) => {
  const navigation = useNavigation<NavigationProp>();

  const logaOutSession = () => {
    logOut();
    navigation.navigate('screens.login');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.button}>
        <ComeBack style={styles.iconBack} />
      </TouchableOpacity>

      <View style={[styles.containerCenter, !show && {marginLeft: '-9%'}]}>
        <Text style={styles.textCenter} bold>
          {textCenter}
        </Text>
      </View>

      {show && (
        <TouchableOpacity
          onPress={() => logaOutSession()}
          style={styles.iconLogOutContainer}>
          <LogOutIcon style={styles.iconSetting} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: SCREEN_HEIGHT * 0.06,
    backgroundColor: 'white',
    width: '100%',
    paddingHorizontal: 16,
  },
  button: {
    paddingVertical: 10,
  },
  iconBack: {
    width: 24,
    height: 24,
  },
  iconLogOutContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: '3%',
  },
  iconSetting: {
    width: 24,
    height: 24,
  },
  containerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCenter: {
    color: '#1E293B',
    fontWeight: '700',
    fontSize: 19,
  },
});

export default CustomBackButtonProfile;
