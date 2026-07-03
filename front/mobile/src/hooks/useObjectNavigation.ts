import { router } from 'expo-router';
import { create } from 'zustand';

interface State {
  object?: any;
  navigate(path: string, data: any): void;
  clear(): void;
}

export const useObjectNavigation = create<State>((set, get) => ({
  navigate(path: string, data: any) {
    set({ object: data });
    router.navigate(path);
  },

  clear() {
    set({ object: undefined });
  },
}));
