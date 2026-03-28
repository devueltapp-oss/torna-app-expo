import React from 'react';
import {TouchableOpacity, StyleSheet, View, Dimensions} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Text} from '@gluestack-ui/themed';

import ComeBack from '@/assets/icons/come-back-icon';
import {colors} from '@/config/theme';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

const CustomBackButton = ({textCenter}: any) => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.button}>
        <ComeBack style={styles.iconBack} />
        <Text style={styles.textBack}>Regresar</Text>
      </TouchableOpacity>

      <View style={styles.containerCenter}>
        <Text style={styles.textCenter}>{textCenter}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: SCREEN_HEIGHT * 0.06,
    width: '100%',
    paddingHorizontal: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBack: {
    width: 24,
    height: 24,
  },
  textBack: {
    fontSize: 16,
    marginLeft: 6,
    color: colors.neutral600,
  },
  containerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCenter: {
    marginRight: '32%',
    color: '#1E293B',
    fontWeight: '700',
    fontSize: 19,
  },
});

export default CustomBackButton;
