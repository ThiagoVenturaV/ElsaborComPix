
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { CartItem, MenuItem, User } from '../types';

interface AppContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem, selectedFlavor?: string) => void;
  removeFromCart: (itemId: number) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  updateFlavor: (itemId: number, flavor: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  user: User | null;
  login: (name: string, phone: string) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);

  const addToCart = useCallback((item: MenuItem, selectedFlavor?: string) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => 
        cartItem.id === item.id && cartItem.selectedFlavor === selectedFlavor
      );
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem.id === item.id && cartItem.selectedFlavor === selectedFlavor 
            ? { ...cartItem, quantity: cartItem.quantity + 1 } 
            : cartItem
        );
      }
      return [...prevCart, { ...item, quantity: 1, selectedFlavor }];
    });
  }, []);

  const updateFlavor = useCallback((itemId: number, flavor: string) => {
    setCart((prevCart) =>
      prevCart.map((item) => (item.id === itemId ? { ...item, selectedFlavor: flavor } : item))
    );
  }, []);

  const removeFromCart = useCallback((itemId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCart((prevCart) =>
        prevCart.map((item) => (item.id === itemId ? { ...item, quantity } : item))
      );
    }
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const login = (name: string, phone: string) => {
    setUser({ name, phone });
  };

  const logout = () => {
    setUser(null);
  };

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <AppContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateFlavor,
        clearCart,
        cartTotal,
        cartCount,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
