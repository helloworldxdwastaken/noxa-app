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
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { fetchPlaylists, fetchSongs } from '../../api/service';
import { useOffline } from '../../context/OfflineContext';
import { useConnectivity } from '../../hooks/useConnectivity';
import type { AppStackParamList, AppTabsParamList } from '../../navigation/types';
import type { Playlist, Song } from '../../types/models';

type LibraryView = 'artists' | 'albums' | 'tracks' | 'playlists';

interface Artist {
  id: string;
  name: string;
  trackCount: number;
  songs: Song[];
}

interface Album {
  id: string;
  title: string;
  artist: string;
  trackCount: number;
  songs: Song[];
}

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabsParamList, 'Library'>,
  NativeStackScreenProps<AppStackParamList>
>;

const LibraryScreen: React.FC<Props> = ({ navigation }) => {
  const { state: offlineState } = useOffline();
  const connectivity = useConnectivity();
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
        const artistName = song.artist || 'Unknown Artist';
        if (!acc[artistName]) {
          acc[artistName] = { id: artistName, name: artistName, trackCount: 0, songs: [] };
        }
        acc[artistName].songs.push(song);
        acc[artistName].trackCount += 1;
        return acc;
      },
      {} as Record<string, Artist>,
    );
    return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
  }, [songs]);

  // Group songs by album
  const albums = useMemo<Album[]>(() => {
    const grouped = songs.reduce(
      (acc, song) => {
        const albumTitle = song.album || 'Unknown Album';
        const key = `${albumTitle}-${song.artist}`;
        if (!acc[key]) {
          acc[key] = {
            id: key,
            title: albumTitle,
            artist: song.artist,
            trackCount: 0,
            songs: [],
          };
        }
        acc[key].songs.push(song);
        acc[key].trackCount += 1;
        return acc;
      },
      {} as Record<string, Album>,
    );
    return Object.values(grouped).sort((a, b) => a.title.localeCompare(b.title));
  }, [songs]);

  const isLoading = songsLoading || playlistsLoading;
  const isRefetching = songsRefetching || playlistsRefetching;

  const handleRefresh = () => {
    refetchSongs();
    refetchPlaylists();
  };

  const renderSong = useCallback(
    ({ item }: { item: Song }) => (
      <TouchableOpacity style={styles.songRow}>
        <View style={styles.artworkSmall}>
          <Text style={styles.artworkLetter}>{item.title?.[0]?.toUpperCase() ?? '♪'}</Text>
        </View>
        <View style={styles.songDetails}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.songSubtitle} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [],
  );

  const renderArtist = useCallback(
    ({ item }: { item: Artist }) => (
      <TouchableOpacity style={styles.gridCard}>
        <View style={styles.artworkLarge}>
          <Text style={styles.artworkIcon}>{item.name?.[0]?.toUpperCase() ?? '🎤'}</Text>
        </View>
        <Text style={styles.gridTitle} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.gridSubtitle}>{item.trackCount} songs</Text>
      </TouchableOpacity>
    ),
    [],
  );

  const renderAlbum = useCallback(
    ({ item }: { item: Album }) => (
      <TouchableOpacity style={styles.gridCard}>
        <View style={styles.artworkLarge}>
          <Text style={styles.artworkIcon}>{item.title?.[0]?.toUpperCase() ?? '💿'}</Text>
        </View>
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
        onPress={() => navigation.navigate('PlaylistDetail', { playlistId: item.id })}
      >
        <View style={styles.artworkLarge}>
          <Text style={styles.artworkIcon}>♪</Text>
        </View>
        <Text style={styles.gridTitle} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.gridSubtitle}>{item.trackCount} tracks</Text>
      </TouchableOpacity>
    ),
    [navigation],
  );

  if (!connectivity.isOffline && isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#ffffff" />
        <Text style={styles.loadingText}>Loading library…</Text>
      </View>
    );
  }

  if (!connectivity.isOffline && songsError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {songsError instanceof Error ? songsError.message : 'Failed to load library'}
        </Text>
      </View>
    );
  }

  const currentData =
    activeView === 'artists'
      ? artists
      : activeView === 'albums'
        ? albums
        : activeView === 'playlists'
          ? playlists
          : songs;

  const currentRenderer =
    activeView === 'artists'
      ? renderArtist
      : activeView === 'albums'
        ? renderAlbum
        : activeView === 'playlists'
          ? renderPlaylist
          : renderSong;

  return (
    <View style={styles.container}>
      {/* View Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeView === 'artists' && styles.tabActive]}
          onPress={() => setActiveView('artists')}
        >
          <Text style={[styles.tabText, activeView === 'artists' && styles.tabTextActive]}>
            🎤 Artists
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeView === 'albums' && styles.tabActive]}
          onPress={() => setActiveView('albums')}
        >
          <Text style={[styles.tabText, activeView === 'albums' && styles.tabTextActive]}>
            💿 Albums
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeView === 'playlists' && styles.tabActive]}
          onPress={() => setActiveView('playlists')}
        >
          <Text style={[styles.tabText, activeView === 'playlists' && styles.tabTextActive]}>
            📂 Playlists
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeView === 'tracks' && styles.tabActive]}
          onPress={() => setActiveView('tracks')}
        >
          <Text style={[styles.tabText, activeView === 'tracks' && styles.tabTextActive]}>
            🎵 Tracks
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={currentData as any[]}
        keyExtractor={item => `${item.id}`}
        renderItem={currentRenderer as any}
        numColumns={activeView === 'tracks' ? 1 : 2}
        key={activeView}
        columnWrapperStyle={activeView !== 'tracks' ? styles.gridRow : undefined}
        contentContainerStyle={currentData.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={!connectivity.isOffline && isRefetching}
            onRefresh={connectivity.isOffline ? undefined : handleRefresh}
            tintColor="#ffffff"
          />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyIcon}>
              {activeView === 'artists' ? '🎤' : activeView === 'albums' ? '💿' : activeView === 'playlists' ? '📂' : '🎵'}
            </Text>
            <Text style={styles.emptyText}>
              {connectivity.isOffline
                ? `No offline ${activeView} available`
                : `No ${activeView} found yet`}
            </Text>
            <Text style={styles.emptySubtext}>
              {connectivity.isOffline
                ? 'Download content while online to access it here.'
                : 'Add music to your library to see it here.'}
            </Text>
          </View>
        }
      />
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
  emptyIcon: {
    fontSize: 64,
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
  },
  artworkLarge: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkIcon: {
    fontSize: 48,
    color: '#8aa4ff',
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  gridSubtitle: {
    fontSize: 12,
    color: '#9090a5',
  },
  songRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e1e2c',
  },
  artworkSmall: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkLetter: {
    color: '#8aa4ff',
    fontSize: 20,
    fontWeight: '600',
  },
  songDetails: {
    flex: 1,
  },
  songTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  songSubtitle: {
    color: '#9090a5',
    marginTop: 4,
  },
});

export default LibraryScreen;
