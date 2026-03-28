import {useCallback} from 'react';
import {FlatList, ListRenderItem, StyleSheet, View} from 'react-native';
import {Text} from '@gluestack-ui/themed';
import React from 'react';

import {NotificationItem} from './NotificationItem';

import {Notification} from '@/config/types';
import {STRINGS} from '@/config/strings';
import {colors} from '@/config/theme';

export type NotificationListProps = {
  data?: Notification[];
  emptyTitle?: string;
};

export const NotificationList = ({
  data,
  emptyTitle = 'Sin notificaciones',
}: NotificationListProps) => {
  const renderItem: ListRenderItem<Notification> = useCallback(
    ({item, index}) => {
      return (
        <NotificationItem
          type="following"
          body={STRINGS.hasStartedToFollow}
          username={item.username}
          timestamp={item.timestamp}
          avatarUrl={item.avatarUrl}
          following={item.following}
          hasBorder
          hasDot={index % 2 === 0}
        />
      );
    },
    [],
  );

  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.title} fontWeight={'bold'}>
          {emptyTitle}
        </Text>
        <Text style={styles.description}>
          Te dejaremos saber cuando haya algo nuevo para tí.
        </Text>
      </View>
    );
  }

  return <FlatList renderItem={renderItem} data={data} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 50,
  },
  title: {
    color: colors.neutral900,
    fontSize: 18,
    textAlign: 'center',
  },
  description: {
    color: colors.neutral400,
    textAlign: 'center',
  },
});
