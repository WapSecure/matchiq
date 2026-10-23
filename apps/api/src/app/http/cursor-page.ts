import { InvalidCursorError } from '@matchiq/db';
import { problem } from './problems';

/** Runs a keyset read, answering `400 invalid-cursor` for a tampered or foreign cursor. */
export const readPage = async <T>(read: () => Promise<T>): Promise<T> => {
  try {
    return await read();
  } catch (error) {
    if (error instanceof InvalidCursorError) throw problem('invalidCursor');
    throw error;
  }
};
