import React, { createContext, useContext } from 'react';
import { useLocalStorage } from 'usehooks-ts';

type FavoritesContextValue = {
  favorites: string[];
  setFavorites: React.Dispatch<React.SetStateAction<string[]>>;
  toggleFavorite: (view: string) => void;
  isFavorite: (view: string) => boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(
  undefined,
);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useLocalStorage<string[]>(
    'mesoview.favorites',
    [],
  );

  const toggleFavorite = (view: string) =>
    setFavorites((prev) =>
      prev.includes(view) ? prev.filter((v) => v !== view) : [...prev, view],
    );

  const isFavorite = (view: string) => favorites.includes(view);

  return (
    <FavoritesContext.Provider
      value={{ favorites, setFavorites, toggleFavorite, isFavorite }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites() must be called within FavoritesProvider');
  return ctx;
}
