import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchPlaylists, fetchSongs } from '../../api/service';
import { useOffline } from '../../context/OfflineContext';
import { useConnectivity } from '../../hooks/useConnectivity';
import type { LibraryStackParamList } from '../../navigation/types';
import type { Playlist, Song } from '../../types/models';
import ArtworkImage from '../../components/ArtworkImage';
import DownloadsScreen from './DownloadsScreen';
import { useLanguage } from '../../context/LanguageContext';

type LibraryView = 'artists' | 'albums' | 'playlists' | 'downloads';

interface Artist {
  id: string;
  name: string;
  trackCount: number;
  songs: Song[];
  artwork?: string | null;
}

interface Album {
  id: string;
  title: string;
  artist: string;
  trackCount: number;
  songs: Song[];
  artwork?: string | null;
}

type Props = NativeStackScreenProps<LibraryStackParamList, 'LibraryMain'>;

const LibraryScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { state: offlineState } = useOffline();
  const connectivity = useConnectivity();
  const { t } = useLanguage();
  const [activeView, setActiveView] = useState<LibraryView>('artists');

  const {
    data: onlineSongs = [],
    isLoading: songsLoading,
    isRefetching: songsRefetching,
    refetch: refetchSongs,
    error: songsError,
  } = useQuery({
    queryKey: ['library', 'songs'],
    queryFn: () => fetchSongs({ limit: 500 }),
    enabled: !connectivity.isOffline,
  });

  const {
    data: onlinePlaylists = [],
    isLoading: playlistsLoading,
    isRefetching: playlistsRefetching,
    refetch: refetchPlaylists,
  } = useQuery({
    queryKey: ['playlists'],
    queryFn: fetchPlaylists,
    enabled: !connectivity.isOffline,
  });

  const songs = connectivity.isOffline
    ? Object.values(offlineState.tracks).map(entry => entry.song)
    : onlineSongs;

  const playlists: Playlist[] = connectivity.isOffline
    ? Object.values(offlineState.playlists).map(entry => ({
        id: entry.playlist.id,
        name: entry.playlist.name,
        description: entry.playlist.description,
        trackCount: entry.songIds.length,
        coverUrl: entry.artworkUri,
        createdAt: entry.downloadedAt,
        userId: entry.playlist.userId,
      }))
    : onlinePlaylists;

  // Group songs by artist
  const artists = useMemo<Artist[]>(() => {
    const grouped = songs.reduce(
      (acc, song) => {
        const artistName = song.artist || t('library.unknownArtist');
        if (!acc[artistName]) {
          acc[artistName] = {
            id: artistName,
            name: artistName,
            trackCount: 0,
            songs: [],
            artwork: song.albumCover ?? null,
          };
        }
        acc[artistName].songs.push(song);
        acc[artistName].trackCount += 1;
        if (!acc[artistName].artwork && song.albumCover) {
          acc[artistName].artwork = song.albumCover;
        }
        return acc;
      },
      {} as Record<string, Artist>,
    );
    return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
  }, [songs, t]);

  // Group songs by album
  const albums = useMemo<Album[]>(() => {
    const grouped = songs.reduce(
      (acc, song) => {
        const albumTitle = song.album || t('library.unknownAlbum');
        const key = `${albumTitle}-${song.artist}`;
        if (!acc[key]) {
          acc[key] = {
            id: key,
            title: albumTitle,
            artist: song.artist,
            trackCount: 0,
            songs: [],
            artwork: song.albumCover ?? null,
          };
        }
        acc[key].songs.push(song);
        acc[key].trackCount += 1;
        if (!acc[key].artwork && song.albumCover) {
          acc[key].artwork = song.albumCover;
        }
        return acc;
      },
      {} as Record<string, Album>,
    );
    return Object.values(grouped).sort((a, b) => a.title.localeCompare(b.title));
  }, [songs, t]);

  const isLoading = songsLoading || playlistsLoading;
  const isRefetching = songsRefetching || playlistsRefetching;

  const handleRefresh = () => {
    refetchSongs();
    refetchPlaylists();
  };

  const labelForView = useCallback(
    (view: LibraryView) => {
      switch (view) {
        case 'artists':
          return t('library.artists');
        case 'albums':
          return t('library.albums');
        case 'playlists':
          return t('library.playlists');
        case 'downloads':
        default:
          return t('library.downloads');
      }
    },
    [t],
  );

  const tabItems = useMemo(
    () => [
      { key: 'artists' as LibraryView, label: t('library.artists'), icon: 'mic' as const },
      { key: 'albums' as LibraryView, label: t('library.albums'), icon: 'disc' as const },
      { key: 'playlists' as LibraryView, label: t('library.playlists'), icon: 'music' as const },
      { key: 'downloads' as LibraryView, label: t('library.downloads'), icon: 'download' as const },
    ],
    [t],
  );

  const renderArtist = useCallback(
    ({ item }: { item: Artist }) => (
      <TouchableOpacity style={styles.gridCard}>
        <ArtworkImage
          uri={item.artwork}
          size={140}
          fallbackLabel={item.name?.[0]?.toUpperCase() ?? 'A'}
          shape="circle"
        />
        <Text style={styles.gridTitle} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.gridSubtitle}>
          {t('playlist.trackCount', { count: item.trackCount })}
        </Text>
      </TouchableOpacity>
    ),
    [t],
  );

  const renderAlbum = useCallback(
    ({ item }: { item: Album }) => (
      <TouchableOpacity style={styles.gridCard}>
        <ArtworkImage
          uri={item.artwork}
          size={140}
          fallbackLabel={item.title?.[0]?.toUpperCase() ?? 'A'}
        />
        <Text style={styles.gridTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.gridSubtitle} numberOfLines={1}>
          {item.artist}
        </Text>
      </TouchableOpacity>
    ),
    [],
  );

  const renderPlaylist = useCallback(
    ({ item }: { item: Playlist }) => (
      <TouchableOpacity
        style={styles.gridCard}
        onPress={() =>
          navigation.navigate('PlaylistDetail', {
            playlistId: item.id,
            playlistName: item.name,
            description: item.description,
            coverUrl: item.coverUrl ?? undefined,
            trackCount: item.trackCount,
          })
        }
      >
        <ArtworkImage
          uri={item.coverUrl}
          size={140}
          fallbackLabel={item.name?.[0]?.toUpperCase()}
        />
        <Text style={styles.gridTitle} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.gridSubtitle}>
          {t('playlist.trackCount', { count: item.trackCount })}
        </Text>
      </TouchableOpacity>
    ),
    [navigation, t],
  );

  if (!connectivity.isOffline && isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#ffffff" />
        <Text style={styles.loadingText}>{t('library.loading')}</Text>
      </View>
    );
  }

  if (!connectivity.isOffline && songsError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {songsError instanceof Error ? songsError.message : t('library.error')}
        </Text>
      </View>
    );
  }

  const activeLabel = labelForView(activeView);
  const activeLabelLower = activeLabel.toLowerCase();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {/* View Tabs */}
      <View style={styles.tabs}>
        {tabItems.map(item => {
          const isActive = activeView === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveView(item.key)}
            >
              <View style={styles.tabLabel}>
                <Icon
                  name={item.icon}
                  size={14}
                  color={isActive ? '#ffffff' : '#9090a5'}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{item.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {activeView === 'downloads' ? (
        <View style={styles.downloadsWrapper}>
          <DownloadsScreen />
        </View>
      ) : (
        <FlatList
          data={(activeView === 'artists' ? artists : activeView === 'albums' ? albums : playlists) as any[]}
          keyExtractor={item => `${item.id}`}
          renderItem={(activeView === 'artists' ? renderArtist : activeView === 'albums' ? renderAlbum : renderPlaylist) as any}
          numColumns={2}
          key={activeView}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={
            (activeView === 'artists' ? artists : activeView === 'albums' ? albums : playlists).length === 0
              ? styles.emptyContainer
              : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={!connectivity.isOffline && isRefetching}
              onRefresh={connectivity.isOffline ? undefined : handleRefresh}
              tintColor="#ffffff"
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <View style={styles.emptyIconCircle}>
                <Icon
                  name={activeView === 'artists' ? 'mic' : activeView === 'albums' ? 'disc' : 'music'}
                  size={28}
                  color="#8aa4ff"
                />
              </View>
              <Text style={styles.emptyText}>
                {connectivity.isOffline
                  ? t('library.noOfflineData', { view: activeLabelLower })
                  : t('library.noData', { view: activeLabelLower })}
              </Text>
              <Text style={styles.emptySubtext}>
                {connectivity.isOffline
                  ? t('library.downloadsHint')
                  : t('library.libraryHint')}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#282828',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#121212',
    alignItems: 'center',
  },
  tabLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#1db954',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9090a5',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    gap: 12,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: '#e6e6f2',
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1b1b26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#9090a5',
    textAlign: 'center',
  },
  downloadsWrapper: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    backgroundColor: '#000000',
  },
  gridRow: {
    gap: 16,
    paddingHorizontal: 0,
  },
  gridCard: {
    flex: 1,
    maxWidth: '48%',
    gap: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  gridSubtitle: {
    fontSize: 12,
    color: '#9090a5',
    textAlign: 'center',
  },
});

export default LibraryScreen;
