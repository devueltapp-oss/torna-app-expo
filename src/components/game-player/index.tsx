import {useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';

import SimpleVideoPlayer from '@/components/simple-video-player';

import {getGame} from '@/utils/request';
import {GamePlayerProps} from '@/config/types';
import {useAuth} from '@/contexts/authContext';
import {getValidStreamUrl} from '@/utils/streaming';
import {colors} from '@/config/theme';

function GamePlayer(props: GamePlayerProps) {
  const [stream, setStream] = useState<string>('');
  const [streamError, setStreamError] = useState<string>('');
  const {getAccessToken} = useAuth();
  const {showErrorOverlay = true} = props;

  const getData = async () => {
    try {
      const accessToken = await getAccessToken();
      const game = await getGame(props.gameId, accessToken);
      
      if (game && game.stream) {
        // Guardar URL original para debug
        const originalUrl =
          typeof game.stream === 'string' ? game.stream.trim() : '';
        if (!originalUrl) {
          setStreamError('Streaming no disponible');
          return;
        }

        const validUrl = getValidStreamUrl(originalUrl);
        if (validUrl) {
          setStream(validUrl);
          setStreamError('');
        } else {
          setStreamError('URL de streaming no válida');
        }
      } else {
        setStreamError('Streaming no disponible');
      }
    } catch (error) {
      setStreamError('Error al cargar el streaming');
    }
  };

  useEffect(() => {
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.gameId]);

  // Mostrar error si hay uno
  if (streamError) {
    if (!showErrorOverlay) {
      return <View style={props.style} />;
    }

    return (
      <View style={[props.style, styles.errorContainer]}>
        <Text style={styles.errorText}>{streamError}</Text>
      </View>
    );
  }

  // Mostrar placeholder mientras carga
  if (!stream) {
    return <View style={props.style} />;
  }

  return (
    <View style={props.style}>
      <SimpleVideoPlayer 
        source={{uri: stream}} 
        style={props.style}
        onBack={() => {
          // Lógica para volver atrás si es necesario
        }}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  errorContainer: {
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default GamePlayer;
