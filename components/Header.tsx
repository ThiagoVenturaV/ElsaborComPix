import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-orange-600">El Sabor</h1>
        <nav>
          {/* Add nav links if needed */}
        </nav>
      </div>
    </header>
  );
};

export default Header;