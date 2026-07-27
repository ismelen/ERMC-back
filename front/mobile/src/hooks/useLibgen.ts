import { create } from 'zustand';
import { BACKEND_API_URL } from '../constants';
import { TransactionSource } from '../models/transaction-source';

interface State {
  search(query?: string): Promise<TransactionSource[] | undefined>;
  selected: Record<string, TransactionSource>;

  selectBook(book: TransactionSource): void;
  clear(): void;
}

export const useLibgen = create<State>((set, get) => ({
  selected: {},

  async search(query?: string): Promise<TransactionSource[] | undefined> {
    try {
      if (!query) return;

      const resp = await fetch(`${BACKEND_API_URL}/books/search?q=${query ?? ''}`, {
        method: 'GET',
      });

      if (!resp.ok || resp.status !== 200) return;
      return await resp.json();
    } catch (e) {
      console.error('books search', e);
      return;
    }
  },

  clear() {
    set({ selected: {} });
  },

  selectBook(book: TransactionSource) {
    const exists = !!get().selected[book.src];
    const selected = get().selected;

    if (exists) {
      delete selected[book.src];
    } else {
      selected[book.src] = book;
    }

    set({ selected: { ...selected } });
  },
}));
