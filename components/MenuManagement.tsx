import React, { useState, useEffect } from 'react';
import { MenuItem } from '../types';
import { fetchMenu, createMenuItem, updateMenuItem, deleteMenuItem } from '../services/api';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/icons';

interface MenuManagementProps {
  onClose: () => void;
}

const MenuManagement: React.FC<MenuManagementProps> = ({ onClose }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: '',
    flavors: '',
  });

  const categories = ['Hambúrgueres', 'Pizzas', 'Acompanhamentos', 'Bebidas', 'Sobremesas'];

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      setLoading(true);
      setError(null);
      const menu = await fetchMenu();
      setMenuItems(menu);
    } catch (err) {
      setError('Erro ao carregar o cardápio');
      console.error('Failed to load menu:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      
      const menuItemData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        image: formData.image || 'https://picsum.photos/400/300',
        flavors: formData.flavors ? formData.flavors.split(',').map(f => f.trim()).filter(f => f) : undefined,
      };

      if (editingItem) {
        await updateMenuItem(editingItem.id, menuItemData);
      } else {
        await createMenuItem(menuItemData);
      }

      await loadMenu();
      resetForm();
    } catch (err) {
      setError('Erro ao salvar item do cardápio');
      console.error('Failed to save menu item:', err);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      image: item.image,
      flavors: item.flavors ? item.flavors.join(', ') : '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este item?')) {
      try {
        setError(null);
        await deleteMenuItem(id);
        await loadMenu();
      } catch (err) {
        setError('Erro ao excluir item do cardápio');
        console.error('Failed to delete menu item:', err);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      image: '',
      flavors: '',
    });
    setEditingItem(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Gerenciar Cardápio</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowForm(true)}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Novo Item
              </button>
              <button
                onClick={onClose}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-100 text-red-700 border-l-4 border-red-500">
            {error}
          </div>
        )}

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {showForm && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-semibold mb-4">
                {editingItem ? 'Editar Item' : 'Novo Item'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preço (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={3}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL da Imagem
                    </label>
                    <input
                      type="url"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="https://exemplo.com/imagem.jpg"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sabores (Opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.flavors}
                      onChange={(e) => setFormData({ ...formData, flavors: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Ex: Bovino, Frango, Vegetariano (separados por vírgula)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Separe os sabores por vírgula. Deixe em branco se não houver opções de sabor.
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600"
                  >
                    {editingItem ? 'Atualizar' : 'Criar'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item) => (
              <div key={item.id} className="bg-white border rounded-lg p-4 shadow-sm">
                <div className="aspect-w-16 aspect-h-9 mb-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-32 object-cover rounded-md"
                  />
                </div>
                <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-bold text-orange-600">
                    R$ {item.price.toFixed(2)}
                  </span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {item.category}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 flex items-center justify-center text-sm"
                  >
                    <PencilIcon className="w-4 h-4 mr-1" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex-1 bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 flex items-center justify-center text-sm"
                  >
                    <TrashIcon className="w-4 h-4 mr-1" />
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>

          {menuItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum item encontrado no cardápio.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuManagement;
