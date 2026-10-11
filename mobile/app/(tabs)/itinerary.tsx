import { EmptyState } from '@/components/ui/ScreenState';

export default function ItineraryScreen() {
  return (
    <EmptyState
      title="No stops yet"
      message="Import a screenshot of your itinerary to see your stops here."
    />
  );
}
