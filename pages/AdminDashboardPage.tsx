import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// FIX: `useReactToPrint` is a named export, not a default export.
import { useReactToPrint } from 'react-to-print';
import { Order, OrderStatus, translateDeliveryType, translateOrderStatus } from '../types';
import { fetchOrders, updateOrderStatus } from '../services/api';
import OrderTicket from '../components/OrderTicket';
import MenuManagement from '../components/MenuManagement';
import { CheckCircleIcon, XCircleIcon, MotorcycleIcon, MenuIcon } from '../components/icons';

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
  const [showMenuManagement, setShowMenuManagement] = useState(false);
  const [lastPrintedOrderId, setLastPrintedOrderId] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const printComponentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printComponentRef,
    onAfterPrint: () => {
      setOrderToPrint(null);
      setIsPrinting(false);
      setLastPrintedOrderId(null);
    },
    onBeforePrint: () => {
      setIsPrinting(true);
      // Pequeno delay para garantir que o componente esteja renderizado
      return new Promise(resolve => setTimeout(resolve, 100));
    },
    pageStyle: `
      @page {
        size: 58mm auto;
        margin: 0;
      }
      @media print {
        body { margin: 0; }
        * { box-sizing: border-box; }
      }
    `,
    documentTitle: `Pedido-${orderToPrint?.id.slice(-6)}`,
  });

  const loadOrders = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const fetchedOrders = await fetchOrders();
      
      // Verifica se há novos pedidos
      const pendingOrders = fetchedOrders.filter(order => order.status === OrderStatus.PENDING);
      if (pendingOrders.length > lastOrderCount && lastOrderCount > 0) {
        // Notificação de novo pedido
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Novo Pedido!', {
            body: `${pendingOrders.length} pedido(s) pendente(s)`,
            icon: '/favicon.ico'
          });
        }
      }
      
      setLastOrderCount(pendingOrders.length);
      setOrders(fetchedOrders);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [lastOrderCount]);

  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('isAdminAuthenticated');
    if (!isAuthenticated) {
      navigate('/admin');
    } else {
      loadOrders();
      
      if (autoRefreshEnabled) {
        // Solicita permissão para notificações
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
        
        const interval = setInterval(loadOrders, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
      }
    }
  }, [navigate, loadOrders, autoRefreshEnabled]);

  useEffect(() => {
    if (orderToPrint) {
      // Pequeno delay para garantir que o componente esteja renderizado
      setTimeout(() => {
        handlePrint();
      }, 100);
    }
  }, [orderToPrint]);

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const updatedOrder = await updateOrderStatus(orderId, status);
      setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? updatedOrder : o));
      if (status === OrderStatus.ACCEPTED && autoPrintEnabled && lastPrintedOrderId !== orderId) {
        setLastPrintedOrderId(orderId);
        setOrderToPrint(updatedOrder);
      }
    } catch (error) {
      console.error("Failed to update order status:", error);
    }
  };

  const getStatusClass = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 'bg-yellow-100 text-yellow-800';
      case OrderStatus.ACCEPTED: return 'bg-blue-100 text-blue-800';
      case OrderStatus.CANCELED: return 'bg-red-100 text-red-800';
      case OrderStatus.OUT_FOR_DELIVERY: return 'bg-purple-100 text-purple-800';
      case OrderStatus.READY_FOR_PICKUP: return 'bg-indigo-100 text-indigo-800';
      case OrderStatus.COMPLETED:
      case OrderStatus.DELIVERED: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderOrderCard = (order: Order) => (
    <div key={order.id} className="bg-white rounded-lg shadow-md p-4 flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg">Pedido #{order.id.slice(-6)}</h3>
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(order.status)}`}>
          {translateOrderStatus(order.status)}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-2">{new Date(order.createdAt).toLocaleTimeString('pt-BR')}</p>
      <div className="border-t border-b my-2 py-2 flex-grow">
        {order.items.map((item, index) => (
          <div key={`${item.id}-${index}`}>
            <p className="text-sm text-gray-700">{item.quantity}x {item.name}</p>
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
      <div className="mt-2">
        <p className="font-semibold">Total: {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        <p className="text-sm">Cliente: {order.user.name} - {order.user.phone}</p>
        <p className="text-sm">Tipo: {translateDeliveryType(order.deliveryType)}</p>
      </div>
      {order.status === OrderStatus.PENDING && (
        <div className="flex mt-4 space-x-2">
          <button onClick={() => handleUpdateStatus(order.id, OrderStatus.ACCEPTED)} className="flex-1 bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 flex items-center justify-center">
            <CheckCircleIcon className="w-5 h-5 mr-1" /> Aceitar
          </button>
          <button onClick={() => handleUpdateStatus(order.id, OrderStatus.CANCELED)} className="flex-1 bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 flex items-center justify-center">
            <XCircleIcon className="w-5 h-5 mr-1" /> Cancelar
          </button>
        </div>
      )}
      {order.status === OrderStatus.ACCEPTED && (
        <div className="flex mt-4 space-x-2">
            <button 
              onClick={() => {
                setLastPrintedOrderId(order.id);
                setOrderToPrint(order);
              }} 
              className="bg-gray-500 text-white px-3 py-2 rounded-md hover:bg-gray-600 flex items-center justify-center"
            >
              🖨️ Imprimir
            </button>
            {order.deliveryType === 'DELIVERY' && 
                <button onClick={() => handleUpdateStatus(order.id, OrderStatus.OUT_FOR_DELIVERY)} className="flex-1 bg-purple-500 text-white px-3 py-2 rounded-md hover:bg-purple-600 flex items-center justify-center">
                    <MotorcycleIcon className="w-5 h-5 mr-1" /> Enviar Entrega
                </button>
            }
            {order.deliveryType === 'PICKUP' &&
                <button onClick={() => handleUpdateStatus(order.id, OrderStatus.READY_FOR_PICKUP)} className="flex-1 bg-indigo-500 text-white px-3 py-2 rounded-md hover:bg-indigo-600 flex items-center justify-center">
                    Pronto para Retirada
                </button>
            }
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Notificação de Impressão */}
      {isPrinting && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white text-center py-2 z-50">
          🖨️ Imprimindo ticket do pedido #{orderToPrint?.id.slice(-6)}...
        </div>
      )}
      
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Painel da Cozinha</h1>
            <div className="flex space-x-4 mt-1 text-sm text-gray-600">
              <span>Total: {orders.length}</span>
              <span className="text-yellow-600">Pendentes: {orders.filter(o => o.status === OrderStatus.PENDING).length}</span>
              <span className="text-blue-600">Aceitos: {orders.filter(o => o.status === OrderStatus.ACCEPTED).length}</span>
            </div>
          </div>
          <div className="flex space-x-2">
            <div className="flex items-center space-x-4">
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={autoPrintEnabled}
                  onChange={(e) => setAutoPrintEnabled(e.target.checked)}
                  className="mr-2"
                />
                Impressão Automática
              </label>
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={autoRefreshEnabled}
                  onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                  className="mr-2"
                />
                Refresh Automático
              </label>
              {isRefreshing && (
                <div className="flex items-center text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Atualizando...
                </div>
              )}
            </div>
            <button 
              onClick={() => setShowMenuManagement(true)} 
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center"
            >
              <MenuIcon className="w-5 h-5 mr-2" />
              Gerenciar Cardápio
            </button>
            <button 
              onClick={loadOrders} 
              disabled={isRefreshing}
              className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 disabled:bg-gray-400 flex items-center"
            >
              {isRefreshing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Atualizando...
                </>
              ) : (
                'Atualizar Pedidos'
              )}
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {loading ? (
          <p>Carregando pedidos...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {orders.filter(o => o.status === OrderStatus.PENDING).map(renderOrderCard)}
            {orders.filter(o => o.status !== OrderStatus.PENDING).map(renderOrderCard)}
          </div>
        )}
      </main>
      <div className="hidden">
        <OrderTicket ref={printComponentRef} order={orderToPrint} />
      </div>
      
      {showMenuManagement && (
        <MenuManagement onClose={() => setShowMenuManagement(false)} />
      )}
    </div>
  );
};

export default AdminDashboardPage;