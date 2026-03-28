import { PressableOpacityScaled } from "@/components/custom-buttons";
import CustomHeader from "@/components/header/CustomHeader";
import { colors } from "@/config/theme";
import { useAuth } from "@/contexts/authContext";
import { MainNavigatorParamList } from "@/navigators/main-navigator";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { gluestackUIConfig } from "../../../config/gluestack-ui.config";
import { MaterialIcons } from '@expo/vector-icons'
import { Spinner } from "@/components/Spinner";
import { useCallback, useState, useEffect, useMemo, useRef } from "react";
import { GetGameResponse } from "@/config/types";
import { getGameByIdApi } from "@/api/games/GetGameApi";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { postRegisterResultApi } from "@/api/games/PostRegisterResultApi";

type Game = GetGameResponse & {
  startedAtDate: Date;
  endedAtDate: Date;
}

export function MatchResultRegistrationScreen(
  props: NativeStackScreenProps<MainNavigatorParamList, 'screens.matchResultRegistration'>,
)  {
  const {firebaseUser, getAccessToken} = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [game, setGame] = useState<Game>();
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredResult, setRegisteredResult] = useState<'won' | 'lost' | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getGame = async () => {
    const gameId = props.route.params?.gameId;
    
    if (!gameId || gameId === 'undefined') {
      setGameError('No se proporcionó un ID de partido válido');
      setLoading(false);
      return;
    }

    if (!firebaseUser) {
      setGameError('Debes estar autenticado para ver esta información');
      setLoading(false);
      return;
    }

    setLoading(true);
    setGameError(null);
    try {
      const token = await getAccessToken();
      const res = await getGameByIdApi(token, gameId);

      setGame({
        ...res,
        startedAtDate: new Date(res.startedAt || res.scheduledStartAt),
        endedAtDate: new Date(res.endedAt || res.scheduledEndAt)
      });
    } catch (error: any) {
      console.log(error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message ||
                          'Error al cargar la información del partido. Por favor, intenta nuevamente.';
      setGameError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const registerResult = async (isWinner: boolean) => {
    const gameId = props.route.params?.gameId;
    
    if (!gameId || gameId === 'undefined') {
      setError('No se proporcionó un ID de partido válido');
      return;
    }

    if (!firebaseUser) {
      setError('Debes estar autenticado para registrar el resultado');
      return;
    }

    setRegistering(true);
    setError(null);
    
    // Limpiar timeout anterior si existe
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    try {
      const token = await getAccessToken();
      const res = await postRegisterResultApi(token, gameId, isWinner);

      console.log('res:', res);
      setIsRegistered(true);
      setRegisteredResult(isWinner ? 'won' : 'lost');
      
      // Navegar a Highlight Editor después de 1.5 segundos para que el usuario vea la confirmación
      timeoutRef.current = setTimeout(() => {
        navigation.navigate('screens.highlightEditor', {
          gameId,
        });
      }, 1500);
    } catch (error: any) {
      console.log(error);
      // Mostrar mensaje de error descriptivo
      const errorMessage = error?.message || 
                          'Error al registrar el resultado. Por favor, intenta nuevamente.';
      setError(errorMessage);
    } finally {
      setRegistering(false);
    }
  }

  // Limpiar timeout al desmontar componente
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getDateTime = useCallback((date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }, []);

  const getDate = useCallback((date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  const goHome = () => {
    navigation.navigate('navigator.tabs');
  };

  const handleGoBack = () => {
    // Intentar ir atrás, si no hay pantalla anterior, ir a home
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      goHome();
    }
  };

  const handleWin = () => {
    registerResult(true);
  };

  const handleLoose = () => {
    registerResult(false);
  }

  useFocusEffect(
    useCallback(() => {
      getGame();
    }, [props.route.params?.gameId, firebaseUser])
  );

  const containerStyles = {
    flex: 1,
    // Paddings to handle safe area
    // paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
    paddingBottom: insets.bottom,
  };

  return (
    <SafeAreaView style={containerStyles}>
      <CustomHeader
        boolImageTorna={false}
        textCenter={'Partido finalizado'}
        showNotificationIcon={false}
        showProfileIcon={false}
        showLogaout={false}
        customGoBack={handleGoBack}
      />
      <View style={styles.viewContainer}>

        {
          loading && (
            <View style={styles.footer}>
              <PressableOpacityScaled containerStyle={styles.button}>
                <View style={styles.buttonCancel}>
                  <Text style={styles.cancelText}>Cargando...</Text>
                </View>
              </PressableOpacityScaled>
            </View>
          )
        }
        {
          !loading && game && (
            <>
              <View style={styles.summaryContainer}>
                <Text style={styles.title}>🏆 Partido Finalizado</Text>

                <View style={styles.detailsContainer}>
                  
                  <View style={styles.detail}>
                    <Text style={[styles.iconContainer]}>
                      <MaterialIcons name="calendar-month" size={24}/>
                    </Text>
                    <Text style={styles.detailText}>{getDate(game?.startedAtDate)}</Text>
                  </View>

                  <View style={styles.detail}>
                    <Text style={[styles.iconContainer]}>
                      <MaterialIcons name="access-time" size={24}/>
                    </Text>
                    <Text style={styles.detailText}>{getDateTime(game.startedAtDate)} - {getDateTime(game.endedAtDate)}</Text>
                  </View>

                  <View style={[styles.detail, styles.paddingTop]}>
                    <Text style={[styles.iconContainer]}>
                      <MaterialIcons name="people-alt" size={24}/>
                    </Text>
                    <Text style={styles.detailText}><Text style={styles.bold}>Participantes: </Text> {game?.gamePlayers.length}</Text>
                  </View>
                  
                </View>
              </View>

              <View style={styles.optionsContainer}>
                <Text style={[styles.title, styles.titleWhite]}>
                  {isRegistered 
                    ? registeredResult === 'won' 
                      ? '✅ Resultado registrado: Ganaste' 
                      : '❌ Resultado registrado: Perdiste'
                    : '¿Cuál fue el resultado?'}
                </Text>

                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <View style={styles.buttonsContainer}>
                  <PressableOpacityScaled 
                    containerStyle={styles.button} 
                    onPress={handleWin}
                    disabled={registering || isRegistered}
                  >
                    <View style={[
                      styles.buttonSuccess,
                      (registering || (isRegistered && registeredResult !== 'won')) && styles.buttonDisabled,
                      isRegistered && registeredResult === 'won' && styles.buttonSelected
                    ]}>
                      <Text style={[styles.iconContainer, styles.buttonText]}><MaterialIcons name="check" size={24}/></Text>
                      <Text style={styles.buttonText}>Gané</Text>
                    </View>
                  </PressableOpacityScaled>

                  <PressableOpacityScaled 
                    containerStyle={styles.button} 
                    onPress={handleLoose}
                    disabled={registering || isRegistered}
                  >
                    <View style={[
                      styles.buttonDanger,
                      (registering || (isRegistered && registeredResult !== 'lost')) && styles.buttonDisabled,
                      isRegistered && registeredResult === 'lost' && styles.buttonSelected
                    ]}>
                      <Text style={[styles.iconContainer, styles.buttonText]}><MaterialIcons name="close" size={24}/></Text>
                      <Text style={styles.buttonText}>Perdí</Text>
                    </View>
                  </PressableOpacityScaled>
                </View>

              </View>

              <View style={styles.footer}>
                <PressableOpacityScaled 
                  containerStyle={styles.button} 
                  onPress={() => {
                    const gameId = props.route.params?.gameId;
                    if (isRegistered) {
                      goHome();
                    } else if (gameId) {
                      // Navegar a Highlight Editor si se cancela antes de registrar
                      navigation.navigate('screens.highlightEditor', {
                        gameId,
                      });
                    } else {
                      goHome();
                    }
                  }}
                  disabled={registering}
                >
                  <View style={styles.buttonCancel}>
                    <Text style={styles.cancelText}>
                      {isRegistered ? 'Cerrar' : 'Cancelar'}
                    </Text>
                  </View>
                </PressableOpacityScaled>
              </View>
            </>   
          )
        }

        {
          !loading && (!game || gameError) && (
            <View style={styles.emptyMessageContainer}>
              <Text style={[styles.title, styles.center]}>
                {gameError || 'No se ha encontrado esta partida...'}
              </Text>
              {!gameError && (
                <Text style={[styles.detailText, styles.center]}>Intenta más tarde</Text>
              )}
            </View>
          )
        }

        {
          registering && (
            <View style={styles.loadingPanel}>
              <View>
                <Spinner showText={false} color={colors.neutral800} />
              </View>
              <Text style={styles.title}>Registrando resultado...</Text>
            </View>
          )
        }

      </View>

    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  viewContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 8,
    gap: 4,
    position: 'relative',
  },
  paddingTop: {
    paddingTop: 12,
  },
  summaryContainer: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  detailsContainer: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    gap: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral200,
    borderRadius: 14,
  },
  title: {
    color: colors.neutral800,
    fontSize: 24,
    fontWeight: 'bold',
  },
  detail: {
    flexDirection: 'row',
    gap: 4,
  },
  detailText: {
    color: colors.neutral800,
    fontSize: 18,
    textAlignVertical: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailBold: {
    color: colors.neutral800,
    fontSize: 18,
    gap: 2
  },
  bold: {
    fontWeight: 'bold',
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  optionsContainer: {
    flex: 1,
    paddingVertical: 18,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingHorizontal: 12,

  },
  titleWhite: {
    color: colors.white,
  },
  buttonsContainer: {
    flex: 1,
    gap: 32,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  button: {
    width: '100%',
  },
  buttonSuccess: {
    width: '100%',
    paddingVertical: 18,
    backgroundColor: gluestackUIConfig.tokens.colors.success500,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  buttonDanger: {
    width: '100%',
    paddingVertical: 18,
    backgroundColor: colors.danger,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  buttonCancel: {
    width: '100%',
    paddingVertical: 18,
    backgroundColor: colors.muted,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    fontSize: 18,
    color: colors.white,
    fontWeight: 'bold',
  },
  cancelText: {
    fontSize: 18,
    color: colors.primary
  },
  iconContainer: {
    height: '100%',
    justifyContent: 'center',
    textAlignVertical: 'center',
  },
  loadingPanel: {
    position: 'absolute',
    // top: 0,
    // left: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff99',
    flexDirection: 'row',
    gap: 18,
  },
  emptyMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    // backgroundColor: '#ee333ee'
  },
  errorContainer: {
    backgroundColor: colors.danger,
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
    width: '100%',
  },
  errorText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonSelected: {
    borderWidth: 3,
    borderColor: colors.white,
  },
});

export default MatchResultRegistrationScreen;