
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Order, OrderStatus, translatePaymentMethod } from '../types';
import { fetchOrders, updateOrderStatus } from '../services/api';
import { LocationMarkerIcon } from '../components/icons';

const DriverDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const driverId = sessionStorage.getItem('driverId');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const allOrders = await fetchOrders();
      // In a real app, orders would be assigned to specific drivers.
      // Here, we'll just show all orders that are out for delivery.
      setOrders(allOrders.filter(o => o.status === OrderStatus.READY_FOR_PICKUP || o.status === OrderStatus.COMPLETED));
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!driverId) {
      navigate('/driver');
    } else {
      loadOrders();
      const interval = setInterval(loadOrders, 20000); // Refresh every 20 seconds
      return () => clearInterval(interval);
    }
  }, [driverId, navigate, loadOrders]);

  const handleMarkAsDelivered = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, OrderStatus.COMPLETED);
      loadOrders(); // Refresh the list
    } catch (error) {
      console.error("Failed to mark as completed:", error);
    }
  };
  
  // Comentado temporariamente - apenas retirada disponível
  // const openInMaps = (address: string | undefined) => {
  //   if(!address) return;
  //   const query = encodeURIComponent(address);
  //   window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  // };

  return (
    <div className="bg-gray-100 min-h-screen">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Pedidos para Retirada - {driverId}</h1>
          <button onClick={loadOrders} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
            Atualizar
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        {loading ? (
          <p>Carregando pedidos...</p>
        ) : (
          <div className="space-y-4">
            {orders.length === 0 && <p className="text-center text-gray-500">Nenhum pedido para retirada no momento.</p>}
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">Pedido #{order.id.slice(-6)}</h3>
                    {/* Comentado temporariamente - apenas retirada disponível */}
                    {/* <p className="text-gray-700">{order.user.address}</p> */}
                    <p className="text-sm text-gray-500">Cliente: {order.user.name} - {order.user.phone}</p>
                    <p className="text-sm text-gray-500">Total: {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({translatePaymentMethod(order.paymentMethod)})</p>
                    
                    <div className="mt-2">
                      <p className="text-sm font-semibold">Itens:</p>
                      {order.items.map((item, index) => (
                        <div key={`${item.id}-${index}`}>
                          <p className="text-xs text-gray-600">{item.quantity}x {item.name}</p>
                          {item.selectedFlavor && (
                            <p className="text-xs text-blue-600 ml-2">Sabor: {item.selectedFlavor}</p>
                          )}
                        </div>
                      ))}
                      {order.observations && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded">
                          <p className="text-xs font-semibold text-yellow-800">Observações:</p>
                          <p className="text-xs text-yellow-700">{order.observations}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    {/* Comentado temporariamente - apenas retirada disponível */}
                    {/* <button onClick={() => openInMaps(order.user.address)} className="flex items-center bg-gray-200 px-3 py-2 rounded-md hover:bg-gray-300 text-sm font-semibold">
                      <LocationMarkerIcon className="w-5 h-5 mr-1" /> Ver no Mapa
                    </button> */}
                    {order.status === OrderStatus.READY_FOR_PICKUP && (
                      <button onClick={() => handleMarkAsDelivered(order.id)} className="bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 text-sm font-semibold w-full">
                        Marcar como Retirado
                      </button>
                    )}
                    {order.status === OrderStatus.COMPLETED && (
                      <p className="px-3 py-2 text-sm font-semibold text-green-700">Retirado</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default DriverDashboardPage;
