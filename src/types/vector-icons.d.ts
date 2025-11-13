declare module 'react-native-vector-icons/Feather' {
  import type { ComponentType } from 'react';
  import type { TextProps } from 'react-native';

  export interface FeatherIconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  const FeatherIcon: ComponentType<FeatherIconProps>;

  export default FeatherIcon;
}
