import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'NowPlaying'>;

const NowPlayingScreen: React.FC<Props> = ({ navigation }) => {
  // TODO: Connect to PlayerService for actual playback state
  const currentSong: any = null;
  const isPlaying = false;
  const queue: any[] = [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Album Artwork */}
        <View style={styles.artworkContainer}>
          <View style={styles.artwork}>
            <Text style={styles.artworkIcon}>♪</Text>
          </View>
        </View>

        {/* Track Info */}
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle}>{currentSong?.title ?? 'No track playing'}</Text>
          <Text style={styles.trackArtist}>{currentSong?.artist ?? '—'}</Text>
          {currentSong?.album && <Text style={styles.trackAlbum}>{currentSong.album}</Text>}
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>
          <View style={styles.progressTimes}>
            <Text style={styles.progressTime}>0:00</Text>
            <Text style={styles.progressTime}>0:00</Text>
          </View>
        </View>

        {/* Playback Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlBtn}>
            <Text style={styles.controlIcon}>🔀</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn}>
            <Text style={styles.controlIcon}>⏮</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.playBtn}>
            <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶️'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn}>
            <Text style={styles.controlIcon}>⏭</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn}>
            <Text style={styles.controlIcon}>🔁</Text>
          </TouchableOpacity>
        </View>

        {/* Queue */}
        <View style={styles.queueSection}>
          <Text style={styles.queueTitle}>Next in queue</Text>
          {queue.length > 0 ? (
            queue.map((song, index) => (
              <View key={index} style={styles.queueItem}>
                <View style={styles.queueArtwork}>
                  <Text style={styles.queueIcon}>{song.title?.[0] ?? '♪'}</Text>
                </View>
                <View style={styles.queueInfo}>
                  <Text style={styles.queueSongTitle} numberOfLines={1}>
                    {song.title}
                  </Text>
                  <Text style={styles.queueSongArtist} numberOfLines={1}>
                    {song.artist}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyQueue}>Queue is empty</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f1f2b',
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 24,
    color: '#ffffff',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  spacer: {
    width: 40,
  },
  content: {
    padding: 24,
    gap: 32,
  },
  artworkContainer: {
    alignItems: 'center',
  },
  artwork: {
    width: 300,
    height: 300,
    borderRadius: 16,
    backgroundColor: '#1f1f2b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  artworkIcon: {
    fontSize: 80,
    color: '#8aa4ff',
  },
  trackInfo: {
    alignItems: 'center',
    gap: 8,
  },
  trackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  trackArtist: {
    fontSize: 16,
    color: '#9090a5',
    textAlign: 'center',
  },
  trackAlbum: {
    fontSize: 14,
    color: '#7a7a8c',
    textAlign: 'center',
  },
  progressSection: {
    gap: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#1f1f2b',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '0%',
    backgroundColor: '#ffffff',
  },
  progressTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTime: {
    fontSize: 12,
    color: '#9090a5',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  controlBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIcon: {
    fontSize: 28,
    color: '#ffffff',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 32,
  },
  queueSection: {
    gap: 16,
    marginTop: 16,
  },
  queueTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  queueItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  queueArtwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#1f1f2b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueIcon: {
    fontSize: 20,
    color: '#8aa4ff',
  },
  queueInfo: {
    flex: 1,
  },
  queueSongTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
  },
  queueSongArtist: {
    fontSize: 13,
    color: '#9090a5',
    marginTop: 2,
  },
  emptyQueue: {
    fontSize: 14,
    color: '#9090a5',
    textAlign: 'center',
    paddingVertical: 32,
  },
});

export default NowPlayingScreen;

