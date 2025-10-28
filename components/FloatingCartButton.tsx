
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ShoppingCartIcon } from './icons';

const FloatingCartButton: React.FC = () => {
  const { cartCount } = useAppContext();
  const navigate = useNavigate();

  if (cartCount === 0) return null;

  return (
    <button
      onClick={() => navigate('/checkout')}
      className="fixed bottom-6 right-6 bg-orange-600 text-white p-4 rounded-full shadow-lg flex items-center space-x-3 hover:bg-orange-700 transition-all duration-300 z-50 animate-bounce"
    >
      <ShoppingCartIcon className="h-8 w-8" />
      <span className="text-xl font-bold">{cartCount}</span>
      <span className="text-lg">Ver Carrinho</span>
    </button>
  );
};

export default FloatingCartButton;
