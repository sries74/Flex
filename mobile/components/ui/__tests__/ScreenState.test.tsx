import { fireEvent, render, screen } from '@testing-library/react-native';
import { EmptyState, ErrorState, LoadingState } from '../ScreenState';

describe('screen states', () => {
  it('LoadingState shows its message', async () => {
    await render(<LoadingState message="Working…" />);
    expect(screen.getByText('Working…')).toBeTruthy();
  });

  it('EmptyState renders an action only when both label and handler are given', async () => {
    const onAction = jest.fn();
    const { rerender } = await render(<EmptyState title="None" message="Nothing here" />);
    expect(screen.queryByRole('button')).toBeNull();
    await rerender(
      <EmptyState title="None" message="Nothing here" actionLabel="Add" onAction={onAction} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('ErrorState announces the message and offers retry', async () => {
    const onRetry = jest.fn();
    await render(<ErrorState message="Network down" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
