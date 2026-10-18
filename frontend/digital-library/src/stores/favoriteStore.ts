import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface FavoriteDocument {
  id: string | number;
  title?: string;
  name?: string;
  type?: string;
  file_type?: string;
  size?: string | number;
  file_size?: number;
  updatedAt?: string;
  thumbnail_path?: string | null;
  markdown_path?: string | null;
  markdownPath?: string | null;
  file_path?: string | null;
  tags?: Array<{ id: number; name: string }>;
  is_bundle?: boolean;
  [key: string]: unknown;
}

interface FavoriteState {
  favorites: FavoriteDocument[];
  isFavorite: (id: string | number) => boolean;
  getAllFavorites: () => FavoriteDocument[];
  toggleFavorite: (document: FavoriteDocument) => void;
  removeFavorite: (id: string | number) => void;
}

const sameId = (a: string | number, b: string | number) => String(a) === String(b);

export const useFavoriteStore = create<FavoriteState>()(
  persist(
    (set, get) => ({
      favorites: [],
      isFavorite: (id) => get().favorites.some((item) => sameId(item.id, id)),
      getAllFavorites: () => get().favorites,
      toggleFavorite: (document) => {
        set((state) => {
          const exists = state.favorites.some((item) => sameId(item.id, document.id));
          return {
            favorites: exists
              ? state.favorites.filter((item) => !sameId(item.id, document.id))
              : [
                  ...state.favorites,
                  { ...document, id: document.id },
                ],
          };
        });
      },
      removeFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.filter((item) => !sameId(item.id, id)),
        })),
    }),
    {
      name: "foundation-favorites-storage",
      partialize: (state) => ({ favorites: state.favorites }),
    },
  ),
);
