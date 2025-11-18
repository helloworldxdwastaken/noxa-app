import { useMemo } from 'react';

import { useThemeAccent } from '../context/ThemeContext';

export const useAccentColor = () => {
  const { accentOption } = useThemeAccent();

  return useMemo(() => {
    const primary = accentOption.colors[0];
    const secondary = accentOption.colors[1] ?? accentOption.colors[0];
    return {
      accentOption,
      primary,
      secondary,
      isGradient: accentOption.colors.length > 1,
      onPrimary: accentOption.onPrimary,
    };
  }, [accentOption]);
};
