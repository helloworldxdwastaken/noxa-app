import React from 'react';
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
import { fetchLibraryStats, fetchPlaylists, fetchSongs } from '../../api/service';
import type { Playlist, Song } from '../../types/models';

const HomeScreen: React.FC = () => {
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

  const renderPlaylistItem = ({ item }: { item: Playlist }) => (
    <TouchableOpacity
      style={styles.playlistCard}
      onPress={() => {
        // TODO: Navigate to playlist detail when screen is implemented
        console.log('Navigate to playlist', item.id);
      }}
    >
      <View style={styles.playlistArtwork}>
        <Text style={styles.playlistIcon}>♪</Text>
      </View>
      <Text style={styles.playlistName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.playlistTrackCount}>{item.trackCount} tracks</Text>
    </TouchableOpacity>
  );

  const renderRecentTrack = ({ item }: { item: Song }) => (
    <View style={styles.trackCard}>
      <View style={styles.trackArtwork}>
        <Text style={styles.trackIcon}>{item.title?.[0]?.toUpperCase() ?? '♪'}</Text>
      </View>
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#ffffff" />
      }
    >
      {/* Greeting Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good Evening</Text>
      </View>

      {/* Library Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🎵</Text>
          <Text style={styles.statValue}>{stats?.totalSongs ?? '--'}</Text>
          <Text style={styles.statLabel}>Songs</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🎤</Text>
          <Text style={styles.statValue}>{stats?.totalArtists ?? '--'}</Text>
          <Text style={styles.statLabel}>Artists</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💿</Text>
          <Text style={styles.statValue}>{stats?.totalAlbums ?? '--'}</Text>
          <Text style={styles.statLabel}>Albums</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💾</Text>
          <Text style={styles.statValue}>{stats?.totalStorage ?? '--'}</Text>
          <Text style={styles.statLabel}>Storage</Text>
        </View>
      </View>

      {/* Your Playlists Section */}
      {playlists.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Playlists</Text>
            <TouchableOpacity>
              <Text style={styles.showAll}>Show all</Text>
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
            <Text style={styles.sectionTitle}>Recently Added</Text>
            <TouchableOpacity>
              <Text style={styles.showAll}>Show all</Text>
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
    backgroundColor: '#0b0b0f',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#161621',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    fontSize: 32,
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
    gap: 16,
  },
  playlistCard: {
    width: 160,
    gap: 8,
  },
  playlistArtwork: {
    width: 160,
    height: 160,
    borderRadius: 12,
    backgroundColor: '#1f1f2b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistIcon: {
    fontSize: 48,
    color: '#8aa4ff',
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
    width: 160,
    gap: 8,
  },
  trackArtwork: {
    width: 160,
    height: 160,
    borderRadius: 12,
    backgroundColor: '#1f1f2b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackIcon: {
    fontSize: 48,
    color: '#8aa4ff',
  },
  trackInfo: {
    gap: 4,
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

