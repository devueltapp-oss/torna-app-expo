import React from 'react';
import {ActivityIndicator, View, StyleSheet} from 'react-native';
import {useColorScheme} from 'react-native';
import {Text} from '@gluestack-ui/themed';

const CustomActivityIndicator = (props: any) => {
  const colorScheme = useColorScheme();
  const color = colorScheme === 'dark' ? '#primary700' : 'white';
  return (
    <View style={styles.container}>
      <ActivityIndicator color={color} {...props} />
      <Text style={styles.text}>Cargando...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    marginLeft: 10,
    fontSize: 16,
    color: 'white',
  },
});

export default CustomActivityIndicator;
