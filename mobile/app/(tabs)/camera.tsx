import { EmptyState } from '@/components/ui/ScreenState';

export default function CameraScreen() {
  return (
    <EmptyState
      title="Scanning isn't ready yet"
      message="Import an itinerary first, then scan package labels to match them to stops."
    />
  );
}
