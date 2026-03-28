import React from 'react';
import {Text, View, SafeAreaView, StyleSheet} from 'react-native';
import {Button, ButtonText} from '@gluestack-ui/themed';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import CheckSuccesFull from '@/assets/icons/check-succes-ful-iconl';
import {MainNavigatorParamList} from '@/navigators/main-navigator';
import Popup from '@/components/popup/Popup';

type LoginScreenNavigationProp = NativeStackNavigationProp<
  MainNavigatorParamList,
  'screens.shipmentSuccesfull'
>;

const ShipmentSuccessful = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();

  const goToLogin = () => {
    navigation.navigate('navigator.tabs');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.subContainer}>
        <View style={styles.subContainerImageText}>
          <View style={styles.containerImage}>
            <CheckSuccesFull style={styles.positionImage} />
          </View>
          <Text style={styles.titleSuceful}>Te registraste exitosamente</Text>
          <Text style={styles.titleInfo}>
            {' '}
            Ya puedes empezar a grabar tus partidas y mirar las partidas de tus
            amigos{' '}
          </Text>
        </View>
        <Button style={styles.button} onPress={() => goToLogin()}>
          <ButtonText color="$white">Quiero Comenzar</ButtonText>
        </Button>
        <Popup
          description={
            'Se ha enviado un correo de verificación, revisa tu bandeja de entrada'
          }
          positionTop={'79%'}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    flex: 1,
  },
  subContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{translateY: -10}],
  },
  subContainerImageText: {
    width: 265,
  },
  containerImage: {
    alignItems: 'center',
    marginBottom: 20,
  },
  positionImage: {
    alignSelf: 'center',
  },
  titleSuceful: {
    textAlign: 'center',
    color: '#1E293B',
    fontWeight: 'bold',
    fontSize: 28,
    marginBottom: 1,
  },
  titleInfo: {
    textAlign: 'center',
    color: '#1E293B',
    fontSize: 14,
    fontWeight: 'normal',
    marginTop: 10,
  },
  button: {
    height: 56,
    borderRadius: 8,
    marginTop: 20,
  },
});

export default ShipmentSuccessful;
