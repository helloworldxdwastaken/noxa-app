import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  deletePlaylist,
  fetchPlaylistTracks,
  removeTrackFromPlaylist,
  updatePlaylist,
} from '../../api/service';
import { useOffline } from '../../context/OfflineContext';
import type { AppStackParamList } from '../../navigation/types';
import type { Song } from '../../types/models';

type Props = NativeStackScreenProps<AppStackParamList, 'PlaylistDetail'>;

const PlaylistDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { playlistId } = route.params;
  const queryClient = useQueryClient();
  const { downloadPlaylist, removePlaylist, isPlaylistDownloaded } = useOffline();

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDesc, setEditedDesc] = useState('');

  const { data: tracks = [], isLoading, refetch } = useQuery({
    queryKey: ['playlists', playlistId, 'tracks'],
    queryFn: () => fetchPlaylistTracks(playlistId),
  });

  const updateMutation = useMutation({
    mutationFn: () => updatePlaylist(playlistId, { name: editedName, description: editedDesc }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setIsEditing(false);
      Alert.alert('Success', 'Playlist updated');
    },
    onError: () => Alert.alert('Error', 'Failed to update playlist'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePlaylist(playlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      navigation.goBack();
    },
    onError: () => Alert.alert('Error', 'Failed to delete playlist'),
  });

  const removeTrackMutation = useMutation({
    mutationFn: (musicId: number) => removeTrackFromPlaylist(playlistId, musicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists', playlistId, 'tracks'] });
      refetch();
    },
    onError: () => Alert.alert('Error', 'Failed to remove track'),
  });

  const handleDelete = () => {
    Alert.alert('Delete Playlist', 'Are you sure you want to delete this playlist?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  };

  const handleRemoveTrack = (song: Song) => {
    Alert.alert('Remove Track', `Remove "${song.title}" from this playlist?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeTrackMutation.mutate(song.id) },
    ]);
  };

  const handleDownloadOffline = async () => {
    if (tracks.length === 0) {
      Alert.alert('No Tracks', 'Add tracks to this playlist before downloading.');
      return;
    }
    const playlist = {
      id: playlistId,
      name: editedName,
      trackCount: tracks.length,
      coverUrl: null,
    };
    await downloadPlaylist(playlist, tracks);
    Alert.alert('Download Started', 'Playlist is being downloaded for offline playback.');
  };

  const handleRemoveOffline = async () => {
    Alert.alert('Remove Offline', 'Delete this playlist from offline cache?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removePlaylist(playlistId);
        },
      },
    ]);
  };

  const renderTrack = ({ item, index }: { item: Song; index: number }) => (
    <TouchableOpacity
      style={styles.trackRow}
      onLongPress={() => handleRemoveTrack(item)}
    >
      <Text style={styles.trackNumber}>{index + 1}</Text>
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
      <Text style={styles.trackDuration}>
        {item.duration ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : '--:--'}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#ffffff" />
        <Text style={styles.loadingText}>Loading playlist…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          {isEditing ? (
            <>
              <TextInput
                style={styles.nameInput}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Playlist name"
                placeholderTextColor="#606072"
              />
              <TextInput
                style={styles.descInput}
                value={editedDesc}
                onChangeText={setEditedDesc}
                placeholder="Description (optional)"
                placeholderTextColor="#606072"
              />
            </>
          ) : (
            <>
              <Text style={styles.playlistName}>{editedName || 'Untitled Playlist'}</Text>
              {editedDesc && <Text style={styles.playlistDesc}>{editedDesc}</Text>}
              <Text style={styles.trackCount}>{tracks.length} songs</Text>
            </>
          )}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {isEditing ? (
          <>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              <Text style={styles.actionText}>
                {updateMutation.isPending ? 'Saving…' : '💾 Save'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setIsEditing(false)}>
              <Text style={styles.actionText}>✖ Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setEditedName(editedName);
                setEditedDesc(editedDesc);
                setIsEditing(true);
              }}
            >
              <Text style={styles.actionText}>✏️ Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
              <Text style={styles.actionTextDanger}>🗑️ Delete</Text>
            </TouchableOpacity>
            {isPlaylistDownloaded(playlistId) ? (
              <TouchableOpacity style={styles.actionBtn} onPress={handleRemoveOffline}>
                <Text style={styles.actionText}>✓ Downloaded</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.actionBtn} onPress={handleDownloadOffline}>
                <Text style={styles.actionText}>⬇ Offline</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Tracks */}
      <FlatList
        data={tracks}
        renderItem={renderTrack}
        keyExtractor={item => `${item.id}`}
        contentContainerStyle={tracks.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyIcon}>🎵</Text>
            <Text style={styles.emptyText}>No tracks in this playlist yet.</Text>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#e6e6f2',
  },
  header: {
    padding: 20,
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
  },
  backIcon: {
    fontSize: 28,
    color: '#ffffff',
  },
  headerInfo: {
    gap: 8,
  },
  playlistName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  playlistDesc: {
    fontSize: 14,
    color: '#9090a5',
  },
  trackCount: {
    fontSize: 14,
    color: '#9090a5',
  },
  nameInput: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#121212',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  descInput: {
    fontSize: 14,
    color: '#ffffff',
    backgroundColor: '#121212',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexWrap: 'wrap',
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#121212',
  },
  actionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionTextDanger: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#282828',
  },
  trackNumber: {
    width: 24,
    color: '#9090a5',
    fontSize: 14,
  },
  trackArtwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackIcon: {
    fontSize: 20,
    color: '#8aa4ff',
    fontWeight: '600',
  },
  trackInfo: {
    flex: 1,
    gap: 4,
  },
  trackTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  trackArtist: {
    color: '#9090a5',
    fontSize: 13,
  },
  trackDuration: {
    color: '#9090a5',
    fontSize: 14,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyText: {
    color: '#9090a5',
    fontSize: 16,
  },
});

export default PlaylistDetailScreen;

