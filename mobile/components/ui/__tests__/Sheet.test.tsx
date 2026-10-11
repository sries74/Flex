import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Sheet } from '../Sheet';

describe('Sheet', () => {
  it('renders its title and content when visible', async () => {
    await render(
      <Sheet visible title="Details" onClose={() => {}}>
        <Text>Body</Text>
      </Sheet>,
    );
    expect(screen.getByText('Details')).toBeTruthy();
    expect(screen.getByText('Body')).toBeTruthy();
  });

  it('renders nothing when hidden', async () => {
    await render(
      <Sheet visible={false} title="Details" onClose={() => {}}>
        <Text>Body</Text>
      </Sheet>,
    );
    expect(screen.queryByText('Body')).toBeNull();
  });

  it('calls onClose from the Close button', async () => {
    const onClose = jest.fn();
    await render(
      <Sheet visible title="Details" onClose={onClose}>
        <Text>Body</Text>
      </Sheet>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
