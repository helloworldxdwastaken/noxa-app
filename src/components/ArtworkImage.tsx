import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';

import { useAuth } from '../context/AuthContext';
import { getCachedImage } from '../utils/imageCache';

type ArtworkImageProps = {
  uri?: string | null;
  size: number;
  fallbackLabel?: string;
  shape?: 'rounded' | 'circle';
  useCache?: boolean; // Enable caching for specific images
};

const isAbsoluteUri = (value: string) =>
  value.startsWith('http://') ||
  value.startsWith('https://') ||
  value.startsWith('file://') ||
  value.startsWith('data:');

const ArtworkImage: React.FC<ArtworkImageProps> = ({ 
  uri, 
  size, 
  fallbackLabel, 
  shape = 'rounded',
  useCache = false,
}) => {
  const {
    state: { baseUrl },
  } = useAuth();
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cachedUri, setCachedUri] = useState<string | null>(null);

  const resolvedUri = useMemo(() => {
    if (!uri) {
      return null;
    }
    if (isAbsoluteUri(uri)) {
      return uri;
    }
    const normalizedBase = baseUrl.replace(/\/+$/, '');
    const normalizedPath = uri.startsWith('/') ? uri : `/${uri}`;
    return `${normalizedBase}${normalizedPath}`;
  }, [baseUrl, uri]);

  // Load cached image if caching is enabled
  useEffect(() => {
    if (useCache && resolvedUri) {
      getCachedImage(resolvedUri)
        .then(cached => {
          if (cached) {
            setCachedUri(cached);
          }
        })
        .catch(error => {
          console.warn('Failed to get cached image:', error);
        });
    }
  }, [resolvedUri, useCache]);

  const borderRadius = shape === 'circle' ? size / 2 : 12;
  const imageUri = useCache && cachedUri ? cachedUri : resolvedUri;

  if (imageUri && !failed) {
    return (
      <View style={{ width: size, height: size, borderRadius }}>
        {loading && (
          <View style={[styles.placeholder, { width: size, height: size, borderRadius }]} />
        )}
        <Image
          source={{ uri: imageUri }}
          style={[styles.image, { width: size, height: size, borderRadius }]}
          onError={() => setFailed(true)}
          onLoadStart={() => setLoading(true)}
          onLoad={() => setLoading(false)}
          onLoadEnd={() => setLoading(false)}
        />
      </View>
    );
  }

  const showInitial = Boolean(fallbackLabel && fallbackLabel !== '♪');

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius,
        },
      ]}
    >
      {showInitial ? (
        <Text style={styles.fallbackText}>{fallbackLabel}</Text>
      ) : (
        <Icon name="music" size={Math.max(16, size * 0.4)} color="#9ca3af" />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#1b1b21',
  },
  placeholder: {
    position: 'absolute',
    backgroundColor: '#2a2a2a',
    zIndex: 1,
  },
  fallback: {
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#9ca3af',
    fontSize: 20,
    fontWeight: '600',
  },
});

export default ArtworkImage;
