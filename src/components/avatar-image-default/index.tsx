import {AvatarFallbackText, AvatarImage, Text} from '@gluestack-ui/themed';
import {StyleSheet, View} from 'react-native';
import {ImageProps} from 'react-native';
import {colors} from '@/config/theme';

type AvatarImageDefaultProps = ImageProps & {
  fallbackText?: string;
};

export default function AvatarImageDefault(props: AvatarImageDefaultProps) {
  const avatarIcon = require('@/assets/utils/avatarIcon.png');

  const uri = props.source && (props.source as any).uri;
  const thereIsSource = uri && uri.trim() !== '' && uri !== 'null' && uri !== 'undefined';

  if (!thereIsSource && props.fallbackText && props.fallbackText.trim() !== '') {
    const getInitials = (text: string): string => {
      const cleanText = text.trim();
      if (!cleanText) return '';
      
      const words = cleanText.split(/\s+/).filter(word => word && word.length > 0);
      
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      } else if (words.length === 1) {
        return words[0][0].toUpperCase();
      }
      
      return cleanText.substring(0, 2).toUpperCase();
    };
    
    const initials = getInitials(props.fallbackText);
    
    if (initials && initials.length > 0) {
      return (
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackText}>{initials}</Text>
        </View>
      );
    }
  }
  
  if (thereIsSource) {
    return (
      <AvatarImage
        {...props}
        source={props.source}
        style={[styles.avatar, props.style]}
      />
    );
  }
  
  return (
    <AvatarImage
      {...props}
      source={avatarIcon}
      style={[styles.avatar, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 75 / 2,
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
    backgroundColor: colors.primary,
  },
  fallbackText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: colors.white,
  },
});
