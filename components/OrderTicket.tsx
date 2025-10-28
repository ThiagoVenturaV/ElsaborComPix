import React from 'react';
import { Order, translateDeliveryType, translatePaymentMethod } from '../types';

interface OrderTicketProps {
  order: Order | null;
}

// FIX: Removed incorrect `React.FC` type annotation. Components wrapped in `forwardRef`
// have a specific type that includes the `ref` prop, which `React.FC` does not.
// Allowing TypeScript to infer the type from `React.forwardRef` solves the issue.
const OrderTicket = React.forwardRef<HTMLDivElement, OrderTicketProps>(({ order }, ref) => {
  if (!order) return null;

  const styles = `
    @media print {
      body * {
        visibility: hidden;
      }
      #print-section, #print-section * {
        visibility: visible;
      }
      #print-section {
        position: absolute;
        left: 0;
        top: 0;
        width: 58mm;
        font-family: 'Courier New', Courier, monospace;
        font-size: 7pt;
        color: #000;
        line-height: 1.2;
        padding: 2mm;
      }
      .ticket-header, .ticket-footer {
        text-align: center;
      }
      .ticket-item {
        display: flex;
        justify-content: space-between;
      }
      .ticket-item span:first-child {
        flex-grow: 1;
        white-space: normal;
        word-break: break-all;
      }
       .ticket-item span:last-child {
        white-space: nowrap;
      }
      hr {
        border-top: 1px dashed #000;
      }
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div id="print-section" ref={ref} className="hidden print:block">
        <div className="ticket-header">
          <h2 className="font-bold">El Sabor</h2>
          <p>{new Date(order.createdAt).toLocaleString('pt-BR')}</p>
          <p>Pedido: {order.id.slice(-6)}</p>
          <hr className="my-1" />
        </div>
        <div>
          <p>Cliente: {order.user.name}</p>
          <p>Telefone: {order.user.phone}</p>
          <p>Tipo: {translateDeliveryType(order.deliveryType)}</p>
          {/* Comentado temporariamente - apenas retirada disponível */}
          {/* {order.deliveryType === 'DELIVERY' && <p>Endereço: {order.user.address}</p>} */}
          <hr className="my-1" />
        </div>
        <div>
          {order.items.map((item, index) => (
            <div key={`${item.id}-${index}`} className="my-1">
              <div className="ticket-item">
                <span>{item.quantity}x {item.name}</span>
                <span>{item.price.toFixed(2)}</span>
              </div>
              {item.selectedFlavor && (
                <div className="ml-1">
                  Sabor: {item.selectedFlavor}
                </div>
              )}
            </div>
          ))}
        </div>
        <hr className="my-1" />
        <div className="ticket-item font-bold">
            <span>TOTAL</span>
            <span>{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div className="mt-1">
            <p>Pagamento: {translatePaymentMethod(order.paymentMethod)}</p>
            {order.observations && (
              <div className="mt-1">
                <p className="font-semibold">Obs:</p>
                <p>{order.observations}</p>
              </div>
            )}
        </div>
        <div className="ticket-footer mt-2">
            <p>Obrigado!</p>
        </div>
      </div>
    </>
  );
});

export default OrderTicket;