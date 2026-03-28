import {
  Input,
  InputField,
  SafeAreaView,
  VStack,
  View,
  Text,
  Button,
  ButtonText,
} from '@gluestack-ui/themed';

import MatchCard from '@/components/match-card';
import {STRINGS} from '@/config/strings';
import {colors} from '@/config/theme';
import home from '@/mocks/home.json';

const item = home[0].data[0];

const RecordedMatchScreen = () => {
  return (
    <SafeAreaView style={{flex: 1, backgroundColor: colors.background}}>
      <View style={{flex: 1, padding: 16}}>
        <VStack space="xs" marginBottom="$4">
          <Text fontWeight="$bold">{STRINGS.titleOfYourMatch}</Text>
          <Input>
            <InputField placeholder={STRINGS.addAMessageToYourMatch} />
          </Input>
          <Text color={colors.tintMuted}>0/240</Text>
        </VStack>
        <MatchCard
          id={item.id}
          imageUrl={item.cover}
          viewers={item.viewers}
          users={item.users}
          clubName={item.club.name}
          floor={item.club.floor}
          showVideoPlayer={false}
        />
        <Button marginTop="$4">
          <ButtonText>{STRINGS.saveVideo}</ButtonText>
        </Button>
      </View>
    </SafeAreaView>
  );
};

export default RecordedMatchScreen;
