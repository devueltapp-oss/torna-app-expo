import React from 'react';
import {StyleSheet} from 'react-native';

import FullViewMessage from '../full-view-message';

interface FullViewMessageRacketProps {
  message: string;
}

const racketImage = require('@/assets/images/racket.png');

function FullViewMessageRacket({message}: FullViewMessageRacketProps) {
  return (
    <FullViewMessage
      message={message}
      image={racketImage}
      imageStyle={styles.image}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: 280,
    height: 280,
  },
});

export default FullViewMessageRacket;
