import * as ImagePicker from 'expo-image-picker';
import { toImageInput, type ImageResult } from './toImageInput';

export type PickOutcome = { status: 'cancelled' } | { status: 'picked'; result: ImageResult };

/**
 * Let the driver choose an itinerary screenshot. Uses the system photo picker, which needs no
 * broad photo-library permission. quality < 1 shrinks the upload (and the cost of reading it).
 */
export async function pickItineraryImage(): Promise<PickOutcome> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    base64: true,
    quality: 0.7,
    allowsMultipleSelection: false,
  });
  if (picked.canceled || picked.assets.length === 0) return { status: 'cancelled' };
  return { status: 'picked', result: toImageInput(picked.assets[0]) };
}
