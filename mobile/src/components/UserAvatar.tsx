import { Image, Text, View } from 'react-native';
import { avatarColor } from '@/lib/avatar-colors';

interface UserAvatarProps {
  /** Drives the monogram letter and its deterministic colour */
  name: string;
  avatarUrl?: string | null;
  /** Diameter in points */
  size: number;
  /** Monogram font size; defaults to a little over a third of the diameter */
  textSize?: number;
}

/**
 * One avatar for every surface — the web's UserAvatar: the uploaded photo
 * when there is one, else the same deterministic-colour monogram both apps
 * have always drawn. Status dots go on a wrapper around this, not inside it.
 */
export function UserAvatar({ name, avatarUrl, size, textSize }: UserAvatarProps) {
  const label = name.trim() || '?';
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={[shape, { backgroundColor: '#f5f5f5' }]} accessibilityIgnoresInvertColors />;
  }

  const color = avatarColor(label);
  return (
    <View style={[shape, { backgroundColor: color.bg }]} className="items-center justify-center overflow-hidden">
      <Text style={{ color: color.text, fontSize: textSize ?? Math.round(size * 0.36) }} className="font-sans-bold uppercase">
        {label.charAt(0)}
      </Text>
    </View>
  );
}
