import { create } from 'zustand';
import { BACKEND_API_URL } from '../constants';
import { TransactionSource } from '../models/transaction-source';

interface State {
  search(query?: string): Promise<TransactionSource[] | undefined>;
  selected: Record<string, TransactionSource>;

  selectBook(book: TransactionSource): void;
  setBooks(books: TransactionSource[]): void;
  clear(): void;
}

export const useLibgen = create<State>((set, get) => ({
  selected: {},

  setBooks(books: TransactionSource[]) {
    const selected: Record<string, TransactionSource> = {};
    for (const book of books) {
      selected[book.src] = book;
    }
    set({ selected });
  },

  async search(query?: string): Promise<TransactionSource[] | undefined> {
    try {
      if (!query) return;

      const resp = await fetch(`${BACKEND_API_URL}/books/search?q=${query ?? ''}`, {
        method: 'GET',
      });

      if (!resp.ok || resp.status !== 200) return;
      const data = await resp.json();
      return data.map((b: any) => ({
        ...b,
        name: b.name || b.title || 'Unknown Title',
        src: b.src || b.md5 || Math.random().toString(),
      })) as TransactionSource[];
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
