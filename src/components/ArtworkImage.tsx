import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { getCachedImage } from '../utils/imageCache';

// Default artwork image
const DEFAULT_ARTWORK = require('../../assets/default artwork_.jpg');

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
  shape = 'rounded',
  useCache = false,
}) => {
  const {
    state: { baseUrl },
  } = useAuth();
  const [imageSource, setImageSource] = useState(DEFAULT_ARTWORK);
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
        .catch(() => {
          // Silently fail, use default artwork
        });
    }
  }, [resolvedUri, useCache]);

  // Update image source when URI is available
  useEffect(() => {
    const finalUri = useCache && cachedUri ? cachedUri : resolvedUri;
    if (finalUri) {
      setImageSource({ uri: finalUri });
    } else {
      setImageSource(DEFAULT_ARTWORK);
    }
  }, [resolvedUri, cachedUri, useCache]);

  const borderRadius = shape === 'circle' ? size / 2 : 12;

  return (
    <Image
      source={imageSource}
      style={[styles.image, { width: size, height: size, borderRadius }]}
      defaultSource={DEFAULT_ARTWORK}
      onError={() => setImageSource(DEFAULT_ARTWORK)}
    />
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#1b1b21',
  },
});

export default ArtworkImage;
