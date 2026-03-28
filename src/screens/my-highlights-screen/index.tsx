import React, {useCallback, useState} from 'react';
import {SafeAreaView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';

import CustomHeader from '@/components/header/CustomHeader';
import {MyHighlightsList} from '@/components/my-highlights-list';
import {Spinner} from '@/components/Spinner';
import {useAuth} from '@/contexts/authContext';
import {getMyHighlightsApi, Highlight} from '@/api/highlights';
import {colors} from '@/config/theme';

function MyHighlightsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const {getAccessToken} = useAuth();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadHighlights = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getAccessToken();
      const data = await getMyHighlightsApi(token);
      setHighlights(data);
    } catch {
      // Non-blocking
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  useFocusEffect(
    useCallback(() => {
      loadHighlights();
    }, [loadHighlights]),
  );

  const containerStyle = {
    flex: 1,
    paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
    paddingBottom: insets.bottom,
  };

  return (
    <SafeAreaView style={[styles.container, containerStyle]}>
      <CustomHeader
        boolImageTorna={false}
        textBack="Regresar"
        textCenter="Mis Highlights"
        showNotificationIcon={false}
        showProfileIcon={false}
        showLogaout={false}
        showEditProfileIcon={false}
      />
      {isLoading ? (
        <View style={styles.centered}>
          <Spinner />
        </View>
      ) : (
        <MyHighlightsList
          highlights={highlights}
          isLoading={false}
          onRefresh={loadHighlights}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white || '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MyHighlightsScreen;
