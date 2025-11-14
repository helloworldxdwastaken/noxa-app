import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
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
import {
  fetchLibraryStats,
  fetchPlaylists,
  fetchSongs,
  addTrackToPlaylist,
  deleteTrack,
} from '../../api/service';
import type { Playlist, Song } from '../../types/models';
import ArtworkImage from '../../components/ArtworkImage';
import { playSong } from '../../services/player/PlayerService';
import Icon from 'react-native-vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppStackParamList, AppTabsParamList } from '../../navigation/types';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useLanguage } from '../../context/LanguageContext';

const TRACK_SEPARATOR_STYLE = { height: 16 };
const TRACK_FOOTER_STYLE = { height: 8 };

const TrackGridSeparator = () => <View style={TRACK_SEPARATOR_STYLE} />;
const TrackGridFooter = () => <View style={TRACK_FOOTER_STYLE} />;

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

  const [trackMenuVisible, setTrackMenuVisible] = useState(false);
  const [playlistPickerVisible, setPlaylistPickerVisible] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Song | null>(null);
  const [addingPlaylistId, setAddingPlaylistId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleOpenTrackMenu = (track: Song) => {
    setSelectedTrack(track);
    setTrackMenuVisible(true);
  };

  const closeTrackMenu = () => {
    setTrackMenuVisible(false);
    setSelectedTrack(null);
  };

  const handleAddToPlaylist = async (playlistId: number) => {
    if (!selectedTrack) {
      return;
    }
    try {
      setAddingPlaylistId(playlistId);
      await addTrackToPlaylist(playlistId, selectedTrack.id);
      Alert.alert(t('common.ok'), t('common.addedToPlaylist'));
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('common.unableToAddTrack'),
      );
    } finally {
      setAddingPlaylistId(null);
      setPlaylistPickerVisible(false);
      setSelectedTrack(null);
    }
  };

  const handleDeleteTrack = async (permanent: boolean) => {
    if (!selectedTrack) {
      return;
    }
    try {
      setDeleting(true);
      await deleteTrack(selectedTrack.id, permanent);
      Alert.alert(t('common.ok'), permanent ? t('common.deleted') : t('common.removed'));
      refetchTracks();
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('common.error'));
    } finally {
      setDeleting(false);
      setTrackMenuVisible(false);
      setSelectedTrack(null);
    }
  };

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
      <TouchableOpacity
        style={styles.trackMenuButton}
        onPress={() => handleOpenTrackMenu(item)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Icon name="more-vertical" size={18} color="#ffffff" />
      </TouchableOpacity>
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
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('Library', {
                  screen: 'LibraryMain',
                  params: { view: 'playlists' },
                })
              }
            >
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
          </View>
          <FlatList
            data={recentTracks}
            renderItem={renderRecentTrack}
            keyExtractor={item => `${item.id}`}
            numColumns={2}
            columnWrapperStyle={styles.trackColumn}
            scrollEnabled={false}
            ItemSeparatorComponent={TrackGridSeparator}
            ListFooterComponent={TrackGridFooter}
            contentContainerStyle={styles.trackGrid}
          />
        </View>
      )}

      {playlistsLoading || tracksLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#ffffff" />
        </View>
      ) : null}

      <Modal
        visible={trackMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeTrackMenu}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeTrackMenu} />
          <View style={styles.dialogCard}>
            <Text style={styles.sheetTitle}>
              {selectedTrack?.title ?? t('common.trackActions')}
            </Text>
            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => {
                setTrackMenuVisible(false);
                setPlaylistPickerVisible(true);
              }}
            >
              <Icon name="plus-circle" size={18} color="#ffffff" />
              <Text style={styles.sheetActionText}>{t('common.addToPlaylist')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => handleDeleteTrack(false)}
              disabled={deleting}
            >
              <Icon name="minus-circle" size={18} color="#fbbf24" />
              <Text style={styles.sheetActionText}>{t('common.removeFromLibrary')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => handleDeleteTrack(true)}
              disabled={deleting}
            >
              <Icon name="trash-2" size={18} color="#f87171" />
              <Text style={[styles.sheetActionText, styles.sheetDangerText]}>
                {t('common.deletePermanent')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetAction} onPress={closeTrackMenu}>
              <Icon name="x" size={18} color="#ffffff" />
              <Text style={styles.sheetActionText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={playlistPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPlaylistPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPlaylistPickerVisible(false)}
          />
          <View style={[styles.dialogCard, styles.playlistDialog]}>
            <Text style={styles.sheetTitle}>{t('playlist.choosePlaylist')}</Text>
            {playlists.length === 0 ? (
              <Text style={styles.sheetEmpty}>{t('search.noPlaylistsAction')}</Text>
            ) : (
              <ScrollView
                style={styles.playlistScroll}
                contentContainerStyle={styles.playlistList}
                showsVerticalScrollIndicator
              >
                {playlists.map(playlist => (
                  <TouchableOpacity
                    key={playlist.id}
                    style={styles.sheetAction}
                    onPress={() => handleAddToPlaylist(playlist.id)}
                    disabled={addingPlaylistId === playlist.id}
                  >
                    {addingPlaylistId === playlist.id ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Icon name="folder-plus" size={18} color="#ffffff" />
                    )}
                    <Text style={styles.sheetActionText}>{playlist.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => {
                setPlaylistPickerVisible(false);
                setSelectedTrack(null);
              }}
            >
              <Icon name="x" size={18} color="#ffffff" />
              <Text style={styles.sheetActionText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  trackGrid: {
    paddingHorizontal: 24,
    gap: 16,
  },
  trackColumn: {
    gap: 16,
  },
  trackCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#121212',
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackMenuButton: {
    padding: 6,
    marginLeft: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  dialogCard: {
    backgroundColor: '#050505',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 16,
  },
  sheetTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  sheetActionText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  sheetDangerText: {
    color: '#f87171',
  },
  playlistDialog: {
    maxHeight: '75%',
  },
  sheetEmpty: {
    color: '#9090a5',
    fontSize: 14,
  },
  playlistScroll: {
    maxHeight: 260,
  },
  playlistList: {
    gap: 8,
  },
});

export default HomeScreen;
