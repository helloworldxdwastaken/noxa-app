import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { fetchSongs } from '../../api/service';
import { useOffline } from '../../context/OfflineContext';
import { useConnectivity } from '../../hooks/useConnectivity';
import type { Song } from '../../types/models';

const LibraryScreen: React.FC = () => {
  const { state: offlineState } = useOffline();
  const connectivity = useConnectivity();

  const {
    data: onlineSongs = [],
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ['library', 'songs'],
    queryFn: () => fetchSongs({ limit: 200 }),
    enabled: !connectivity.isOffline,
  });

  const songs = connectivity.isOffline
    ? Object.values(offlineState.tracks).map(entry => entry.song)
    : onlineSongs;

  const renderItem = useCallback(({ item }: { item: Song }) => {
    return (
      <View style={styles.songRow}>
        <View style={styles.artworkPlaceholder}>
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
      </View>
    );
  }, []);

  const keyExtractor = useCallback((item: Song) => `${item.id}`, []);

  if (!connectivity.isOffline && isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#ffffff" />
        <Text style={styles.loadingText}>Loading your library…</Text>
      </View>
    );
  }

  if (!connectivity.isOffline && error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'Failed to load library'}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={songs}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={songs.length === 0 ? styles.emptyContainer : styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={!connectivity.isOffline && isRefetching}
          onRefresh={connectivity.isOffline ? undefined : refetch}
          tintColor="#ffffff"
        />
      }
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            {connectivity.isOffline ? 'No offline songs available.' : 'No songs found yet.'}
          </Text>
          <Text style={styles.emptySubtext}>
            {connectivity.isOffline
              ? 'Download playlists while online to play them here.'
              : 'Add tracks from your downloads or Spotify imports.'}
          </Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0b0f',
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0b0b0f',
    gap: 8,
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
    backgroundColor: '#0b0b0f',
  },
  songRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e1e2c',
  },
  artworkPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1f1f2b',
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

