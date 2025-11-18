export const hexToRgba = (hex: string, alpha: number) => {
  const sanitized = hex.replace('#', '');
  const expanded = sanitized.length === 3 ? sanitized.split('').map(ch => ch + ch).join('') : sanitized;
  const bigint = parseInt(expanded, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
