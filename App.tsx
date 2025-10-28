
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import MenuPage from './pages/MenuPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import DriverLoginPage from './pages/DriverLoginPage';
import DriverDashboardPage from './pages/DriverDashboardPage';
import CheckoutPage from './pages/CheckoutPage';

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <div className="bg-gray-50 min-h-screen">
          <Routes>
            <Route path="/" element={<MenuPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/admin" element={<AdminLoginPage />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/driver" element={<DriverLoginPage />} />
            <Route path="/driver/dashboard" element={<DriverDashboardPage />} />
          </Routes>
        </div>
      </HashRouter>
    </AppProvider>
  );
};

export default App;
