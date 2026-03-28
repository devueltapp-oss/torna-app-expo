import { StyleSheet, View } from "react-native"
import { HomeMatchCard } from ".."
import { Spinner } from "@/components/Spinner"
import { Heading, SectionList } from "@gluestack-ui/themed";
import { colors } from "@/config/theme";
import { SCREEN_WIDTH } from "@/utils/constants";
import RenderMatchCard from "./render-match-card";
import { useAuth } from "@/contexts/authContext";

export default function UpcomingMatchesList({
  upcomingMatches,
  loading,
  handleOnPress
}: {
  upcomingMatches: HomeMatchCard[],
  loading: boolean,
  handleOnPress?: ((payload: any) => void) | undefined,
}) {
  const { firebaseUser } = useAuth();

  const renderItemHorizontal = (data: any) => {
    // data: { item: HomeMatchCard, index: any, section: any, separators: any }
    return (
      <View style={styles.horizontalMatchCard}>
        {/* {renderItem(data)} */}
        <RenderMatchCard {...data} handleOnPress={handleOnPress} firebaseUser={firebaseUser} />
      </View>
    );
  }
  
  // loader commmented for dont block design
  // if (loading && upcomingMatches.length === 0) {
  //   return (
  //     <View style={{ maxHeight: 100 }}>
  //       <Spinner />
  //     </View>
  //   )
  // }

  return upcomingMatches.length > 0 && (
    <View style={styles.container}>
      <Heading style={styles.headings} marginVertical="$3" marginHorizontal="$4">
        Próximas partidas
      </Heading>
      <SectionList
        sections={[{data: upcomingMatches}]}
        renderItem={renderItemHorizontal}
        stickySectionHeadersEnabled={false}
        keyExtractor={item => (item as HomeMatchCard).id}
        contentContainerStyle={styles.upcomingList}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  headings: {
    color: colors.neutral800,
    fontSize: 20,
    alignSelf: 'flex-start',
    width: '100%',
    paddingHorizontal: 16,
  },
  upcomingList: {
    paddingHorizontal: 16,
    paddingRight: 16,
    gap: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  horizontalMatchCard: {
    width: SCREEN_WIDTH * 0.8,
    minWidth: 250,
  },
});