import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { searchLibrary } from '../../api/service';
import type { Song } from '../../types/models';

const SearchScreen: React.FC = () => {
  const [query, setQuery] = useState('');

  const { data, isFetching, error } = useQuery({
    queryKey: ['library', 'search', query],
    queryFn: () => searchLibrary(query.trim()),
    enabled: query.trim().length > 1,
  });

  const renderItem = ({ item }: { item: Song }) => (
    <View style={styles.resultRow}>
      <Text style={styles.resultTitle}>{item.title}</Text>
      <Text style={styles.resultSubtitle}>{item.artist}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search your library"
        placeholderTextColor="#606072"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      {error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : 'Search failed'}
          </Text>
        </View>
      ) : isFetching ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#ffffff" />
          <Text style={styles.loadingText}>Searching…</Text>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={item => `${item.id}`}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            query.trim().length <= 1 ? (
              <View style={styles.centered}>
                <Text style={styles.helperText}>Start typing to search your local library.</Text>
              </View>
            ) : (
              <View style={styles.centered}>
                <Text style={styles.helperText}>No results found.</Text>
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
    padding: 16,
    backgroundColor: '#0b0b0f',
    gap: 16,
  },
  searchInput: {
    backgroundColor: '#161621',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#e6e6f2',
  },
  helperText: {
    color: '#9090a5',
  },
  errorText: {
    color: '#ff6b6b',
  },
  resultRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f1f2b',
  },
  resultTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultSubtitle: {
    color: '#9090a5',
    marginTop: 4,
  },
});

export default SearchScreen;

