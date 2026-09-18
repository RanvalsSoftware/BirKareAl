import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const MAX_BYTES = 15 * 1024 * 1024;

export type PickedStudioImage = {
  uri: string;
  name: string;
};

export function useStudioImagePicker(onSelected: (image: PickedStudioImage) => void) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);

  async function open() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.92,
      });
      const asset = result.canceled ? null : result.assets[0];
      if (!asset) return;
      if (asset.fileSize && asset.fileSize > MAX_BYTES) {
        Alert.alert('Dosya büyük', 'Lütfen 15 MB altındaki bir JPEG, PNG, WebP veya HEIC seç.');
        return;
      }
      onSelected({ uri: asset.uri, name: asset.fileName ?? 'studio-source' });
    } catch {
      Alert.alert('Görsel seçilemedi', 'Galeriyi yeniden açıp başka bir görsel deneyebilirsin.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return { open, busy };
}
