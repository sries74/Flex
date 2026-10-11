import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { createFakeAuthService } from '@/lib/auth/fake';
import { AuthProvider, useAuth } from '../AuthProvider';

function Probe() {
  const { status, user } = useAuth();
  return <Text>{`${status}:${user?.email ?? 'none'}`}</Text>;
}

describe('AuthProvider', () => {
  it('reports signedOut when there is no session', async () => {
    await render(
      <AuthProvider service={createFakeAuthService()}>
        <Probe />
      </AuthProvider>,
    );
    expect(await screen.findByText('signedOut:none')).toBeTruthy();
  });

  it('restores an existing session', async () => {
    const service = createFakeAuthService({ user: { uid: 'u1', email: 'a@b.co' } });
    await render(
      <AuthProvider service={service}>
        <Probe />
      </AuthProvider>,
    );
    expect(await screen.findByText('signedIn:a@b.co')).toBeTruthy();
  });

  it('follows sign-in and sign-out', async () => {
    const service = createFakeAuthService();
    await render(
      <AuthProvider service={service}>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText('signedOut:none');
    await act(async () => service.signInWithEmail('x@y.zz', 'password1'));
    expect(await screen.findByText('signedIn:x@y.zz')).toBeTruthy();
    await act(async () => service.signOut());
    expect(await screen.findByText('signedOut:none')).toBeTruthy();
  });

  it('useAuth throws outside the provider', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<Probe />)).rejects.toThrow('useAuth must be used inside <AuthProvider>');
    spy.mockRestore();
  });
});
