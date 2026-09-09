import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import type { PhotoSelection } from '@/src/types/onboarding';

type UsePhotoPickerOptions = {
  onSelected: (selection: PhotoSelection) => void;
};

function toSelection(asset: ImagePicker.ImagePickerAsset): PhotoSelection {
  return {
    kind: 'device',
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    fileName: asset.fileName,
  };
}

export function usePhotoPicker({ onSelected }: UsePhotoPickerOptions) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    void ImagePicker.getPendingResultAsync().then((pending) => {
      if (!pending || !('canceled' in pending) || pending.canceled || !pending.assets?.[0]) return;
      onSelected(toSelection(pending.assets[0]));
    });
  }, [onSelected]);

  const selectFromGallery = useCallback(async () => {
    if (busy) return;
    setBusy(true);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Galeri izni gerekiyor',
          'Fotoğraf seçebilmek için BirKare AI’ye galeri erişimi vermelisiniz.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.92,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        onSelected(toSelection(result.assets[0]));
        void Haptics.selectionAsync();
      }
    } catch (error) {
      console.error('Gallery picker error', error);
      Alert.alert('Fotoğraf açılamadı', 'Galeriyi açarken bir sorun oluştu. Lütfen tekrar deneyin.');
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
        Alert.alert(
          'Kamera izni gerekiyor',
          'Yeni bir fotoğraf çekmek için BirKare AI’ye kamera erişimi vermelisiniz.',
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.92,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        onSelected(toSelection(result.assets[0]));
        void Haptics.selectionAsync();
      }
    } catch (error) {
      console.error('Camera picker error', error);
      Alert.alert('Kamera açılamadı', 'Kamerayı açarken bir sorun oluştu. Lütfen tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }, [busy, onSelected]);

  return { busy, selectFromGallery, takePhoto };
}
