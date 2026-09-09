import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import { useCallback, useEffect, useState } from 'react';

import type { OnboardingPhoto } from './data';

type Options = { onSelected: (photo: OnboardingPhoto) => void };

function toPhoto(asset: ImagePicker.ImagePickerAsset): OnboardingPhoto {
  return {
    kind: 'device',
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    fileName: asset.fileName,
  };
}

/** Gallery/camera support with Android activity-result recovery. */
export function useOnboardingPhotoPicker({ onSelected }: Options) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void ImagePicker.getPendingResultAsync().then((pending) => {
      if (!pending || !('canceled' in pending) || pending.canceled || !pending.assets?.[0]) return;
      onSelected(toPhoto(pending.assets[0]));
    });
  }, [onSelected]);

  const selectFromGallery = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Galeri izni gerekli', 'Fotoğraf seçebilmek için BirKare AI’ye galeri erişimi ver.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        // Keep the source untouched. The guided preview fits it into its
        // canvas and the optional editor later lets the user choose a crop.
        allowsEditing: false,
        quality: 0.92,
        exif: false,
      });
      if (!result.canceled && result.assets[0]) {
        onSelected(toPhoto(result.assets[0]));
        void Haptics.selectionAsync();
      }
    } catch {
      Alert.alert('Fotoğraf açılamadı', 'Galeriyi açarken bir sorun oldu. Lütfen tekrar dene.');
    } finally {
      setBusy(false);
    }
  }, [busy, onSelected]);

  const takePhoto = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Kamera izni gerekli', 'Yeni bir fotoğraf çekmek için BirKare AI’ye kamera erişimi ver.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        // Do not force a 4:5 crop at capture time.
        allowsEditing: false,
        quality: 0.92,
        exif: false,
      });
      if (!result.canceled && result.assets[0]) {
        onSelected(toPhoto(result.assets[0]));
        void Haptics.selectionAsync();
      }
    } catch {
      Alert.alert('Kamera açılamadı', 'Kamerayı açarken bir sorun oldu. Lütfen tekrar dene.');
    } finally {
      setBusy(false);
    }
  }, [busy, onSelected]);

  return { busy, selectFromGallery, takePhoto };
}
