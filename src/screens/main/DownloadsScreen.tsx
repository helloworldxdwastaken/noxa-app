import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchDownloads } from '../../api/service';
import { useOffline } from '../../context/OfflineContext';
import type { DownloadItem } from '../../types/models';

const DownloadsScreen: React.FC = () => {
  const { state: offlineState } = useOffline();
  const insets = useSafeAreaInsets();

  const {
    data = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['downloads'],
    queryFn: fetchDownloads,
    refetchInterval: 5000,
  });

  if (isLoading && data.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#ffffff" />
        <Text style={styles.loadingText}>Checking downloads…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'Unable to load downloads'}
        </Text>
      </View>
    );
  }

  const offlineProgressEntries = Object.entries(offlineState.downloadProgress);
  const statusMessage = offlineState.statusMessage;

  const headerComponent =
    offlineProgressEntries.length || statusMessage ? (
      <View style={styles.offlineHeader}>
        {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}
        {offlineProgressEntries.map(([playlistId, progress]) => {
          const playlist = offlineState.playlists[Number(playlistId)];
          return (
            <View key={playlistId} style={styles.offlineProgressRow}>
              <View style={styles.offlineProgressText}>
                <Text style={styles.offlineTitle}>
                  {playlist?.playlist.name || `Playlist ${playlistId}`}
                </Text>
                <Text style={styles.offlineSubtitle}>
                  {Math.round((progress ?? 0) * 100)}% downloaded
                </Text>
              </View>
              <View style={styles.offlineProgressBarContainer}>
                <View style={[styles.offlineProgressBar, { width: `${Math.round((progress ?? 0) * 100)}%` }]} />
              </View>
            </View>
          );
        })}
      </View>
    ) : null;

  return (
    <FlatList
      data={data}
      keyExtractor={item => item.id}
      style={[styles.list, { paddingTop: insets.top + 12 }]}
      onRefresh={refetch}
      refreshing={isRefetching}
      ListHeaderComponent={headerComponent}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.helperText}>No downloads yet.</Text>
          <Text style={styles.helperSubtext}>Start a download from the desktop admin panel.</Text>
        </View>
      }
      renderItem={({ item }) => <DownloadRow item={item} />}
    />
  );
};

const statusColorMap: Record<DownloadItem['status'], string> = {
  searching: '#8aa4ff',
  downloading: '#8aa4ff',
  completed: '#4ade80',
  failed: '#f87171',
  cancelled: '#facc15',
  canceled: '#facc15',
  unknown: '#9090a5',
};

const DownloadRow = ({ item }: { item: DownloadItem }) => (
  <View style={styles.row}>
    <View style={styles.rowText}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{item.title}</Text>
        {item.status === 'completed' ? (
          <Icon name="check-circle" size={16} color="#4ade80" />
        ) : null}
      </View>
      <Text style={styles.subtitle}>{item.artist}</Text>
      {item.album ? <Text style={styles.album}>{item.album}</Text> : null}
    </View>
    <View style={[styles.statusChip, { backgroundColor: statusColorMap[item.status] ?? '#9090a5' }]}>
      <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#000000',
  },
  offlineHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statusMessage: {
    color: '#8aa4ff',
    fontWeight: '600',
  },
  offlineProgressRow: {
    gap: 8,
  },
  offlineProgressText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offlineTitle: {
    color: '#ffffff',
    fontWeight: '600',
  },
  offlineSubtitle: {
    color: '#9090a5',
    fontSize: 12,
  },
  offlineProgressBarContainer: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#282828',
    overflow: 'hidden',
  },
  offlineProgressBar: {
    height: '100%',
    backgroundColor: '#1db954',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 24,
  },
  loadingText: {
    color: '#e6e6f2',
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
  },
  helperText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  helperSubtext: {
    color: '#9090a5',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e1e2c',
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: '#9090a5',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  album: {
    color: '#606072',
    fontSize: 12,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 12,
  },
});

export default DownloadsScreen;
