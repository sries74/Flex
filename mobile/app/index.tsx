import { Redirect } from 'expo-router';
import { useAuth } from '@/components/auth/AuthProvider';

/** '/' has no screen of its own: send people to wherever their auth state says they belong. */
export default function Index() {
  const { status } = useAuth();
  return <Redirect href={status === 'signedIn' ? '/itinerary' : '/login'} />;
}
