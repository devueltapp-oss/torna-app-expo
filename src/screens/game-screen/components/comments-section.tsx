import React, {useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import {Text} from '@gluestack-ui/themed';
import {responsiveFontSize} from 'react-native-responsive-dimensions';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {colors} from '@/config/theme';
import FullViewMessage from '@/components/full-view-message';

interface CommentsSectionProps {
  comments?: {
    id?: string;
    username?: string;
    text?: string;
  }[];
}

function CommentsSection({comments}: CommentsSectionProps): React.JSX.Element {
  const [newComment, setNewComment] = useState<string>('');
  const isEmpty = !comments || comments.length === 0;
  const insets = useSafeAreaInsets();
  const keyboardOffset =
    Platform.OS === 'ios' ? Math.max(insets.bottom, 16) + 12 : 0;

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardOffset}>
    <View style={styles.section}>
      <FlatList
        style={styles.commentsList}
        data={comments}
          keyExtractor={(item, index) => item.id ?? `comment-${index}`}
        ListEmptyComponent={<FullViewMessage message="No hay comentarios" />}
          contentContainerStyle={[
            styles.commentsListContainer,
            isEmpty && styles.emptyListContainer,
          ]}
          keyboardShouldPersistTaps="handled"
        renderItem={({item}) => (
          <Pressable>
            {({pressed}) => (
              <View
                style={{
                  ...styles.commentContainer,
                  backgroundColor: pressed ? colors.subtle : 'rgba(1, 1, 1, 0)',
                }}>
                <Text style={styles.username} bold>
                  {item.username}:&nbsp;
                  <Text style={styles.commentText}>{item.text}</Text>
                </Text>
              </View>
            )}
          </Pressable>
        )}
      />
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Escribe un comentario..."
          value={newComment}
          onChangeText={setNewComment}
          style={styles.inputText}
            placeholderTextColor={colors.neutral500}
        />
          <Pressable style={styles.sendButton} onPress={() => {}} disabled>
            <Text style={styles.sendButtonText}>Enviar</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
  },
  section: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    width: '100%',
    backgroundColor: 'white',
  },
  commentsList: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  commentsListContainer: {
    paddingBottom: 12,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  username: {
    color: colors.primary,
    fontWeight: 'normal',
    fontSize: responsiveFontSize(1.58),
  },
  commentText: {
    color: 'black',
    fontWeight: 'normal',
    fontSize: responsiveFontSize(1.58),
  },
  inputContainer: {
    backgroundColor: '#E2E8F0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputText: {
    backgroundColor: '#CBD5E1',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    color: colors.neutral900,
    flex: 1,
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default CommentsSection;
