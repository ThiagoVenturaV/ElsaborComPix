import React, { useEffect, useState } from 'react';
import { MenuItem } from '../types';
import { fetchMenu } from '../services/api';
import Header from '../components/Header';
import MenuItemCard from '../components/MenuItemCard';
import FloatingCartButton from '../components/FloatingCartButton';

const MenuPage: React.FC = () => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const menuItems = await fetchMenu();
        setMenu(menuItems);
      } catch (error) {
        console.error("Failed to fetch menu:", error);
      } finally {
        setLoading(false);
      }
    };
    loadMenu();
  }, []);

  // FIX: Explicitly set the accumulator type for `reduce` to ensure correct type inference for `groupedMenu`.
  const groupedMenu = menu.reduce<Record<string, MenuItem[]>>((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        {loading ? (
          <div className="text-center text-gray-500">Carregando cardápio...</div>
        ) : (
          Object.entries(groupedMenu).map(([category, items]) => (
            <section key={category} className="mb-12">
              <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 border-orange-500 pb-2">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {items.map(item => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>
      <FloatingCartButton />
    </div>
  );
};

export default MenuPage;
