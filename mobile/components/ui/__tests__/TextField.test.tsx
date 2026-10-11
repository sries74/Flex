import { fireEvent, render, screen } from '@testing-library/react-native';
import { TextField } from '../TextField';

describe('TextField', () => {
  it('is labelled and forwards text changes', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Email" value="" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.co');
    expect(onChangeText).toHaveBeenCalledWith('a@b.co');
  });

  it('shows an error message only when provided', async () => {
    const { rerender } = await render(<TextField label="Email" />);
    expect(screen.queryByText('Required')).toBeNull();
    await rerender(<TextField label="Email" error="Required" />);
    expect(screen.getByText('Required')).toBeTruthy();
  });
});
