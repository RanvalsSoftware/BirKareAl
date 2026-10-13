import { tr as translateCopy } from '@/i18n/engine';
import { useRef, useState } from 'react';
import { Alert, Image, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const MAX_BYTES = 15 * 1024 * 1024;

const sampleProduct = require('../../../assets/products/ui/categories/shoes.webp');

export type PickedStudioImage = {
  uri: string;
  name: string;
};

type Source = 'library' | 'camera';

export function useStudioImagePicker(onSelected: (image: PickedStudioImage) => void) {
  const lock = useRef(false);
  const [busy, setBusy] = useState<Source | null>(null);

  async function pick(source: Source) {
    if (lock.current) return;
    lock.current = true;
    setBusy(source);
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            translateCopy('Kamera izni gerekli'),
            translateCopy('Ürün fotoğrafı çekmek için Ayarlar’dan kamera erişimine izin ver.'),
            permission.canAskAgain
              ? undefined
              : [
                  { text: translateCopy('Vazgeç'), style: 'cancel' },
                  { text: translateCopy('Ayarlar'), onPress: () => void Linking.openSettings() },
                ],
          );
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.92,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      const asset = result.canceled ? null : result.assets[0];
      if (!asset) return;
      if (asset.fileSize && asset.fileSize > MAX_BYTES) {
        Alert.alert(translateCopy("Dosya büyük"), translateCopy("Lütfen 15 MB altındaki bir JPEG, PNG, WebP veya HEIC seç."));
        return;
      }
      onSelected({
        uri: asset.uri,
        name: asset.fileName ?? (source === 'camera' ? 'studio-capture' : 'studio-source'),
      });
    } catch {
      if (source === 'camera')
        Alert.alert(
          translateCopy('Kamera açılamadı'),
          translateCopy('Bu cihazda kamera kullanılamıyor. Galeriden bir fotoğraf seçebilirsin.'),
        );
      else
        Alert.alert(translateCopy("Görsel seçilemedi"), translateCopy("Galeriyi yeniden açıp başka bir görsel deneyebilirsin."));
    } finally {
      lock.current = false;
      setBusy(null);
    }
  }

  /** A bundled product photo, so the studio can be tried before any photo exists on the device. */
  function pickSample() {
    onSelected({ uri: Image.resolveAssetSource(sampleProduct).uri, name: 'sample-product.webp' });
  }

  return {
    open: () => pick('library'),
    capture: () => pick('camera'),
    pickSample,
    busy: busy !== null,
    busySource: busy,
  };
}
