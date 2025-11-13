import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { fetchLibraryStats, fetchPlaylists, fetchSongs } from '../../api/service';
import type { Playlist, Song } from '../../types/models';
import ArtworkImage from '../../components/ArtworkImage';
import { playSong } from '../../services/player/PlayerService';
import Icon from 'react-native-vector-icons/Feather';
import type { AppStackParamList, AppTabsParamList } from '../../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useLanguage } from '../../context/LanguageContext';

type HomeTabNav = BottomTabNavigationProp<AppTabsParamList, 'Home'>;
type RootStackNav = NativeStackNavigationProp<AppStackParamList>;
type NavigationProp = CompositeNavigationProp<HomeTabNav, RootStackNav>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const connectivity = useConnectivity();
  const { t } = useLanguage();
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['library', 'stats'],
    queryFn: fetchLibraryStats,
  });

  const {
    data: playlists = [],
    isLoading: playlistsLoading,
    refetch: refetchPlaylists,
  } = useQuery({
    queryKey: ['playlists'],
    queryFn: fetchPlaylists,
  });

  const {
    data: recentTracks = [],
    isLoading: tracksLoading,
    refetch: refetchTracks,
  } = useQuery({
    queryKey: ['library', 'recent'],
    queryFn: () => fetchSongs({ limit: 10 }),
  });

  const isRefreshing = statsLoading || playlistsLoading || tracksLoading;

  const handleRefresh = () => {
    refetchStats();
    refetchPlaylists();
    refetchTracks();
  };

  const statCards = useMemo(
    () => [
      { label: t('home.stats.songs'), value: stats?.totalSongs ?? '--', icon: 'music' as const },
      { label: t('home.stats.artists'), value: stats?.totalArtists ?? '--', icon: 'mic' as const },
      { label: t('home.stats.albums'), value: stats?.totalAlbums ?? '--', icon: 'disc' as const },
      {
        label: t('home.stats.storage'),
        value: stats?.totalStorage ?? '--',
        icon: 'hard-drive' as const,
      },
    ],
    [stats?.totalAlbums, stats?.totalArtists, stats?.totalSongs, stats?.totalStorage, t],
  );

  const handlePlayTrack = useCallback(
    (song: Song) => {
      const queue = recentTracks.filter(track => track.id !== song.id);
      playSong(song, queue).catch(error => console.error('Failed to start playback', error));
    },
    [recentTracks],
  );

  const renderPlaylistItem = ({ item }: { item: Playlist }) => (
    <TouchableOpacity
      style={styles.playlistCard}
      onPress={() => {
        navigation.navigate('Library', {
          screen: 'PlaylistDetail',
          params: {
            playlistId: item.id,
            playlistName: item.name,
            description: item.description,
            coverUrl: item.coverUrl ?? undefined,
            trackCount: item.trackCount,
          },
        });
      }}
    >
      <ArtworkImage
        uri={item.coverUrl}
        size={88}
        fallbackLabel={item.name?.[0]?.toUpperCase()}
      />
      <Text style={styles.playlistName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.playlistTrackCount}>{item.trackCount} tracks</Text>
    </TouchableOpacity>
  );

  const renderRecentTrack = ({ item }: { item: Song }) => (
    <TouchableOpacity style={styles.trackCard} onPress={() => handlePlayTrack(item)}>
      <ArtworkImage
        uri={item.albumCover}
        size={64}
        fallbackLabel={item.title?.[0]?.toUpperCase()}
      />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top + 12 }]}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#ffffff" />
      }
    >
      {/* Greeting Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{t('home.greeting')}</Text>
        {connectivity.isOffline ? (
          <View style={styles.offlineBanner}>
            <Icon name="wifi-off" size={16} color="#fcd34d" />
            <Text style={styles.offlineText}>{t('home.offline')}</Text>
          </View>
        ) : null}
      </View>

      {/* Library Stats */}
      <View style={styles.statsGrid}>
        {statCards.map(card => (
          <View style={styles.statCard} key={card.label}>
            <View style={styles.statIcon}>
              <Icon name={card.icon} size={18} color="#1db954" />
            </View>
            <Text style={styles.statValue}>{card.value}</Text>
            <Text style={styles.statLabel}>{card.label}</Text>
          </View>
        ))}
      </View>

      {/* Your Playlists Section */}
      {playlists.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.playlists')}</Text>
            <TouchableOpacity>
              <Text style={styles.showAll}>{t('home.showAll')}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={playlists.slice(0, 5)}
            renderItem={renderPlaylistItem}
            keyExtractor={item => `${item.id}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      {/* Recently Added */}
      {recentTracks.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.recentlyAdded')}</Text>
            <TouchableOpacity>
              <Text style={styles.showAll}>{t('home.showAll')}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={recentTracks}
            renderItem={renderRecentTrack}
            keyExtractor={item => `${item.id}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      {playlistsLoading || tracksLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#ffffff" />
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  offlineBanner: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offlineText: {
    color: '#fcd34d',
    fontWeight: '600',
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(29,185,84,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#9090a5',
  },
  section: {
    marginTop: 32,
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  showAll: {
    fontSize: 14,
    color: '#9090a5',
    fontWeight: '600',
  },
  horizontalList: {
    paddingHorizontal: 24,
  },
  playlistCard: {
    width: 160,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#121212',
    marginRight: 16,
    gap: 8,
  },
  playlistName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  playlistTrackCount: {
    fontSize: 12,
    color: '#9090a5',
  },
  trackCard: {
    width: 220,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#121212',
    marginRight: 16,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackInfo: {
    gap: 4,
    flex: 1,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  trackArtist: {
    fontSize: 12,
    color: '#9090a5',
  },
  centered: {
    padding: 32,
    alignItems: 'center',
  },
});

export default HomeScreen;
