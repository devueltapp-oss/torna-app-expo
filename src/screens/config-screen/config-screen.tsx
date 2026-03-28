import React from 'react';
import {Button, SafeAreaView} from 'react-native';
import {useStyles} from 'react-native-unistyles';

import StyleSheet from './styles';

function ConfigScreen(): React.JSX.Element | null {
  const {styles} = useStyles(StyleSheet);

  return (
    <SafeAreaView style={styles.safeAreaView}>
      <Button title="Iniciar Stream" />
    </SafeAreaView>
  );
}

export default ConfigScreen;
