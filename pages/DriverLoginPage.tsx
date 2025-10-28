
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DRIVER_IDS = ['DRIVER1', 'DRIVER2']; // Mock driver IDs

const DriverLoginPage: React.FC = () => {
  const [driverId, setDriverId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (DRIVER_IDS.includes(driverId.toUpperCase())) {
      sessionStorage.setItem('driverId', driverId.toUpperCase());
      navigate('/driver/dashboard');
    } else {
      setError('ID de entregador inválido.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center text-gray-800">Login do Entregador</h1>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="driverId" className="text-sm font-bold text-gray-600 block">ID do Entregador</label>
            <input
              id="driverId"
              type="text"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full p-3 mt-1 text-gray-800 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Ex: DRIVER1"
              required
            />
          </div>
          {error && <p className="text-sm text-center text-red-500">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

export default DriverLoginPage;
