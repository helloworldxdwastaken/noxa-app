import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { State } from 'react-native-track-player';

import type { AppStackParamList } from '../navigation/types';
import ArtworkImage from './ArtworkImage';
import { togglePlayback } from '../services/player/PlayerService';
import { useCurrentTrack } from '../hooks/useCurrentTrack';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

const MiniPlayer: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { track, state } = useCurrentTrack();

  const isPlaying =
    state === State.Playing || state === State.Buffering || state === State.Connecting;

  const artwork = useMemo(() => {
    if (typeof track?.artwork === 'string') {
      return track.artwork;
    }
    return undefined;
  }, [track?.artwork]);

  if (!track) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: (insets.bottom || 16) + 24 }]}> 
      <TouchableOpacity
        style={styles.container}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('NowPlaying')}
      >
        <ArtworkImage
          uri={artwork}
          size={48}
          fallbackLabel={track.title?.[0]?.toUpperCase()}
          shape="rounded"
        />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {track.title ?? 'Unknown'}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {track.artist ?? 'Unknown Artist'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.playBtn}
          onPress={e => {
            e.stopPropagation();
            togglePlayback().catch(err => console.warn('Toggle playback failed', err));
          }}
        >
          <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶️'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#101018',
    borderRadius: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 18,
  },
});

export default MiniPlayer;
