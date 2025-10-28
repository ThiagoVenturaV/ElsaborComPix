
import React, { useState } from 'react';
import { MenuItem } from '../types';
import { useAppContext } from '../context/AppContext';

interface MenuItemCardProps {
  item: MenuItem;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item }) => {
  const { addToCart } = useAppContext();
  const [selectedFlavor, setSelectedFlavor] = useState<string>('');
  const [showFlavorModal, setShowFlavorModal] = useState(false);

  const handleAddToCart = () => {
    if (item.flavors && item.flavors.length > 0) {
      setShowFlavorModal(true);
    } else {
      addToCart(item);
    }
  };

  const handleConfirmFlavor = () => {
    if (selectedFlavor) {
      addToCart(item, selectedFlavor);
      setShowFlavorModal(false);
      setSelectedFlavor('');
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300 flex flex-col">
        <img src={item.image} alt={item.name} className="w-full h-48 object-cover" />
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="text-xl font-semibold text-gray-800">{item.name}</h3>
          <p className="text-gray-600 mt-1 flex-grow">{item.description}</p>
          {item.flavors && item.flavors.length > 0 && (
            <p className="text-sm text-blue-600 mt-2">
              {item.flavors.length} opções de sabor disponíveis
            </p>
          )}
          <div className="mt-4 flex justify-between items-center">
            <span className="text-xl font-bold text-orange-600">
              {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
            <button
              onClick={handleAddToCart}
              className="bg-orange-500 text-white font-bold py-2 px-4 rounded-full hover:bg-orange-600 transition-colors duration-300"
            >
              Adicionar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Seleção de Sabor */}
      {showFlavorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Escolha o Sabor</h3>
            <p className="text-gray-600 mb-4">{item.name}</p>
            
            <div className="space-y-2 mb-6">
              {item.flavors?.map((flavor) => (
                <label key={flavor} className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="flavor"
                    value={flavor}
                    checked={selectedFlavor === flavor}
                    onChange={(e) => setSelectedFlavor(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-gray-700">{flavor}</span>
                </label>
              ))}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowFlavorModal(false);
                  setSelectedFlavor('');
                }}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmFlavor}
                disabled={!selectedFlavor}
                className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600 disabled:bg-gray-300"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MenuItemCard;
