import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUpload } from './file-upload';

const KB = 1024;
const RULES = {
  accept: ['application/json', '.json'],
  acceptLabel: 'JSON',
  maxBytes: 4 * KB,
};

const file = (name: string, type: string, bytes = 10) =>
  new File(['x'.repeat(bytes)], name, { type });

// The browser's own `accept` filter is bypassed so the component's checks run.
const setup = () => userEvent.setup({ applyAccept: false });

const fileInput = (): HTMLInputElement => {
  const input = document.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('no file input');
  return input;
};

describe('FileUpload', () => {
  it('passes valid files on and lists the accepted types and size', async () => {
    const user = setup();
    const onFiles = vi.fn();
    render(<FileUpload label="Fixture import" {...RULES} onFiles={onFiles} />);
    expect(screen.getByText('JSON up to 4 KB')).toBeVisible();
    await user.upload(fileInput(), file('week-9.json', 'application/json'));
    expect(onFiles).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'week-9.json' }),
    ]);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('rejects the wrong type with a plain-language reason', async () => {
    const user = setup();
    const onFiles = vi.fn();
    render(<FileUpload label="Fixture import" {...RULES} onFiles={onFiles} />);
    await user.upload(fileInput(), file('notes.txt', 'text/plain'));
    expect(onFiles).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'notes.txt is not a supported file. Use JSON.',
    );
  });

  it('rejects a file over the size limit', async () => {
    const user = setup();
    const onFiles = vi.fn();
    render(<FileUpload label="Fixture import" {...RULES} onFiles={onFiles} />);
    await user.upload(
      fileInput(),
      file('big.json', 'application/json', 8 * KB),
    );
    expect(onFiles).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'big.json is larger than 4 KB. Choose a smaller file.',
    );
  });

  it('shows progress, completion and failure for each item', () => {
    render(
      <FileUpload
        label="Fixture import"
        {...RULES}
        onFiles={vi.fn()}
        onRemove={vi.fn()}
        items={[
          {
            id: 'a',
            name: 'a.json',
            size: 2 * KB,
            progress: 40,
            status: 'uploading',
          },
          { id: 'b', name: 'b.json', size: KB, progress: 100, status: 'done' },
          {
            id: 'c',
            name: 'c.json',
            size: KB,
            progress: null,
            status: 'error',
            error: 'Line 4 is not valid JSON.',
          },
        ]}
      />,
    );
    expect(
      screen.getByRole('progressbar', { name: 'Upload progress for a.json' }),
    ).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByText('Ready')).toBeVisible();
    expect(screen.getByText('Line 4 is not valid JSON.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Remove c.json' })).toBeVisible();
  });
});
