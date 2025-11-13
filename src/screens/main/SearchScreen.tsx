import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { searchLibrary, searchOnlineTracks } from '../../api/service';
import type { AppStackParamList, AppTabsParamList } from '../../navigation/types';
import type { RemoteTrack, Song } from '../../types/models';

type SearchMode = 'local' | 'online';
type OnlineSearchType = 'track' | 'artist' | 'album';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabsParamList, 'Search'>,
  NativeStackScreenProps<AppStackParamList>
>;

const SearchScreen: React.FC<Props> = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('local');
  const [onlineType, setOnlineType] = useState<OnlineSearchType>('track');

  const { data: localResults, isFetching: localFetching } = useQuery({
    queryKey: ['library', 'search', query],
    queryFn: () => searchLibrary(query.trim()),
    enabled: mode === 'local' && query.trim().length > 1,
  });

  const { data: onlineResults, isFetching: onlineFetching } = useQuery({
    queryKey: ['music', 'search', query, onlineType],
    queryFn: () => searchOnlineTracks(query.trim(), onlineType),
    enabled: mode === 'online' && query.trim().length > 1,
  });

  const results = mode === 'local' ? localResults : onlineResults;
  const isFetching = mode === 'local' ? localFetching : onlineFetching;

  const renderLocalItem = ({ item }: { item: Song }) => (
    <TouchableOpacity style={styles.resultRow}>
      <View style={styles.artwork}>
        <Text style={styles.artworkLetter}>{item.title?.[0]?.toUpperCase() ?? '♪'}</Text>
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        <Text style={styles.resultSubtitle}>{item.artist}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderOnlineItem = ({ item }: { item: RemoteTrack }) => (
    <TouchableOpacity style={styles.resultRow}>
      <View style={styles.artwork}>
        <Text style={styles.artworkLetter}>{item.title?.[0]?.toUpperCase() ?? '♪'}</Text>
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        <Text style={styles.resultSubtitle}>{item.artistName}</Text>
        {item.albumTitle && <Text style={styles.resultAlbum}>{item.albumTitle}</Text>}
      </View>
      <TouchableOpacity
        style={styles.downloadBtn}
        onPress={() => navigation.navigate('DownloadRequest')}
      >
        <Text style={styles.downloadIcon}>⬇</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder={mode === 'local' ? 'Search your library' : 'Search online catalog'}
        placeholderTextColor="#606072"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      {/* Search Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'local' && styles.modeBtnActive]}
          onPress={() => setMode('local')}
        >
          <Text style={[styles.modeBtnText, mode === 'local' && styles.modeBtnTextActive]}>
            💾 Local
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'online' && styles.modeBtnActive]}
          onPress={() => setMode('online')}
        >
          <Text style={[styles.modeBtnText, mode === 'online' && styles.modeBtnTextActive]}>
            🌐 Online
          </Text>
        </TouchableOpacity>
      </View>

      {/* Online Search Type Filters */}
      {mode === 'online' && (
        <View style={styles.typeFilters}>
          <TouchableOpacity
            style={[styles.typeChip, onlineType === 'track' && styles.typeChipActive]}
            onPress={() => setOnlineType('track')}
          >
            <Text style={[styles.typeChipText, onlineType === 'track' && styles.typeChipTextActive]}>
              Songs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeChip, onlineType === 'artist' && styles.typeChipActive]}
            onPress={() => setOnlineType('artist')}
          >
            <Text
              style={[styles.typeChipText, onlineType === 'artist' && styles.typeChipTextActive]}
            >
              Artists
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeChip, onlineType === 'album' && styles.typeChipActive]}
            onPress={() => setOnlineType('album')}
          >
            <Text style={[styles.typeChipText, onlineType === 'album' && styles.typeChipTextActive]}>
              Albums
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isFetching ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#ffffff" />
          <Text style={styles.loadingText}>Searching…</Text>
        </View>
      ) : mode === 'local' ? (
        <FlatList<Song>
          data={(results as Song[]) ?? []}
          keyExtractor={item => `${item.id}`}
          renderItem={renderLocalItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            (!results || results.length === 0) && styles.emptyContainer
          }
          ListEmptyComponent={
            query.trim().length <= 1 ? (
              <View style={styles.centered}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>Search for music</Text>
                <Text style={styles.emptyText}>
                  {mode === 'local'
                    ? 'Find songs in your library'
                    : 'Discover millions of tracks online'}
                </Text>
              </View>
            ) : (
              <View style={styles.centered}>
                <Text style={styles.emptyIcon}>😔</Text>
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptyText}>Try different keywords or check your spelling</Text>
              </View>
            )
          }
        />
      ) : (
        <FlatList<RemoteTrack>
          data={(results as RemoteTrack[]) ?? []}
          keyExtractor={item => `${item.id}`}
          renderItem={renderOnlineItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            (!results || results.length === 0) && styles.emptyContainer
          }
          ListEmptyComponent={
            query.trim().length <= 1 ? (
              <View style={styles.centered}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>Search for music</Text>
                <Text style={styles.emptyText}>
                  Discover millions of tracks online
                </Text>
              </View>
            ) : (
              <View style={styles.centered}>
                <Text style={styles.emptyIcon}>😔</Text>
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptyText}>Try different keywords or check your spelling</Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
    gap: 12,
  },
  searchInput: {
    backgroundColor: '#161621',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#161621',
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#4b67ff',
  },
  modeBtnText: {
    color: '#9090a5',
    fontSize: 14,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: '#ffffff',
  },
  typeFilters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#161621',
  },
  typeChipActive: {
    backgroundColor: '#2a2a3e',
  },
  typeChipText: {
    color: '#9090a5',
    fontSize: 13,
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: '#ffffff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  emptyText: {
    fontSize: 14,
    color: '#9090a5',
    textAlign: 'center',
  },
  loadingText: {
    color: '#e6e6f2',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f1f2b',
  },
  artwork: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#1f1f2b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkLetter: {
    fontSize: 24,
    color: '#8aa4ff',
    fontWeight: '600',
  },
  resultInfo: {
    flex: 1,
    gap: 4,
  },
  resultTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultSubtitle: {
    color: '#9090a5',
    fontSize: 14,
  },
  resultAlbum: {
    color: '#7a7a8c',
    fontSize: 12,
  },
  downloadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4b67ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadIcon: {
    fontSize: 18,
  },
});

export default SearchScreen;

