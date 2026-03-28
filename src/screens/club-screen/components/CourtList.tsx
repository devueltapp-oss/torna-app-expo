import React from 'react';
import {FlatList, Image, StyleSheet, View} from 'react-native';
import {Button, ButtonText, Text} from '@gluestack-ui/themed';

import {colors} from '@/config/theme';

export type ClubCourt = {
  id: string;
  name: string;
  surface: string;
  pricePerHour: string;
  availability: string;
  imageUrl: string;
};

type CourtListProps = {
  courts: ClubCourt[];
  onReserve: (court: ClubCourt) => void;
  scrollEnabled?: boolean;
};

const CourtCard = ({
  court,
  onReserve,
}: {
  court: ClubCourt;
  onReserve: (court: ClubCourt) => void;
}) => {
  return (
    <View style={styles.card}>
      <Image
        source={{uri: court.imageUrl}}
        style={styles.image}
        alt={`Imagen de la cancha ${court.name}`}
      />
      <View style={styles.info}>
        <Text style={styles.name} bold>
          {court.name}
        </Text>
        <Text style={styles.detail}>{court.surface}</Text>
        <Text style={styles.detail}>{court.availability}</Text>
        <Text style={styles.price}>{court.pricePerHour}</Text>
        <Button
          style={styles.button}
          variant="solid"
          action="positive"
          onPress={() => onReserve(court)}>
          <ButtonText bold>Reservar</ButtonText>
        </Button>
      </View>
    </View>
  );
};

const CourtList = ({
  courts,
  onReserve,
  scrollEnabled = true,
}: CourtListProps) => {
  return (
    <FlatList
      data={courts}
      keyExtractor={item => item.id}
      renderItem={({item}) => <CourtCard court={item} onReserve={onReserve} />}
      contentContainerStyle={styles.list}
      scrollEnabled={scrollEnabled}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text color={colors.neutral500}>No hay canchas registradas.</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 16,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  image: {
    height: 140,
    width: '100%',
  },
  info: {
    padding: 16,
    gap: 6,
  },
  name: {
    fontSize: 18,
    color: colors.neutral900,
  },
  detail: {
    fontSize: 14,
    color: colors.neutral500,
  },
  price: {
    fontSize: 16,
    color: colors.primary,
    marginTop: 4,
  },
  button: {
    marginTop: 12,
    borderRadius: 8,
  },
  separator: {
    height: 12,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
});

export default CourtList;

