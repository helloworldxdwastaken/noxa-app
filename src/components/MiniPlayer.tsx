import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AppStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

const MiniPlayer: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  // TODO: Connect to PlayerService for actual state
  const currentSong: any = null;
  const isPlaying = false;

  if (!currentSong) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('NowPlaying')}
    >
      <View style={styles.artwork}>
        <Text style={styles.artworkIcon}>♪</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {currentSong?.title ?? 'Unknown'}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {currentSong?.artist ?? 'Unknown Artist'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.playBtn}
        onPress={e => {
          e.stopPropagation();
          // TODO: Toggle play/pause
          console.log('Toggle playback');
        }}
      >
        <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶️'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#161621',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2a3e',
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#1f1f2b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkIcon: {
    fontSize: 20,
    color: '#8aa4ff',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  artist: {
    fontSize: 12,
    color: '#9090a5',
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 20,
  },
});

export default MiniPlayer;

