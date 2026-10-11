import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Stop } from '@/lib/itinerary/itinerary';
import { StopEditor } from '../StopEditor';

const stop: Stop = {
  stopNumber: 2,
  address: '742 Evergreen Terrace',
  windowStartMin: null,
  windowEndMin: 1110,
  packageCount: 1,
  needsReview: true,
};

function setup(props: Partial<React.ComponentProps<typeof StopEditor>> = {}) {
  const onSave = jest.fn();
  const onDelete = jest.fn();
  const onClose = jest.fn();
  return {
    onSave,
    onDelete,
    onClose,
    ui: (
      <StopEditor
        defaultStopNumber={5}
        existingNumbers={[1, 2]}
        onSave={onSave}
        onDelete={onDelete}
        onClose={onClose}
        {...props}
      />
    ),
  };
}

describe('StopEditor', () => {
  it('pre-fills an existing stop and saves edits with the original number', async () => {
    const { ui, onSave, onClose } = setup({ stop });
    await render(ui);
    expect(screen.getByDisplayValue('742 Evergreen Terrace')).toBeTruthy();
    expect(screen.getByDisplayValue('6:30 PM')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Address'), '744 Evergreen Terrace');
    await fireEvent.press(screen.getByRole('button', { name: 'Save stop' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        stopNumber: 2,
        address: '744 Evergreen Terrace',
        needsReview: false,
      }),
      2,
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('starts a new stop at the suggested number', async () => {
    const { ui } = setup();
    await render(ui);
    expect(screen.getByDisplayValue('5')).toBeTruthy();
  });

  it('shows validation errors and does not save', async () => {
    const { ui, onSave, onClose } = setup();
    await render(ui);
    await fireEvent.press(screen.getByRole('button', { name: 'Save stop' }));
    expect(await screen.findByText('Enter the delivery address.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('blocks a stop number that another stop uses', async () => {
    const { ui, onSave } = setup();
    await render(ui);
    await fireEvent.changeText(screen.getByLabelText('Stop number'), '1');
    await fireEvent.changeText(screen.getByLabelText('Address'), '1 Test Lane');
    await fireEvent.press(screen.getByRole('button', { name: 'Save stop' }));
    expect(await screen.findByText('Another stop already uses this number.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('offers delete only when editing', async () => {
    const editing = setup({ stop });
    await render(editing.ui);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete stop' }));
    expect(editing.onDelete).toHaveBeenCalledWith(2);
  });

  it('has no delete button for a new stop', async () => {
    const { ui } = setup();
    await render(ui);
    expect(screen.queryByRole('button', { name: 'Delete stop' })).toBeNull();
  });
});
