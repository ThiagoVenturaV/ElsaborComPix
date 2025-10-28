import React, { useState, useEffect } from "react";

interface PaymentStatus {
  status: string;
  status_detail: string;
  paid: boolean;
}

interface PixPaymentProps {
  qrCode: string;
  qrCodeImage?: string;
  paymentUrl: string;
  paymentId: string;
  amount: number;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const PixPayment: React.FC<PixPaymentProps> = ({
  qrCode,
  qrCodeImage,
  paymentUrl,
  paymentId,
  amount,
  onSuccess,
  onError,
}) => {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Check payment status periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        setIsChecking(true);
        const response = await fetch(`/api/payments/status/${paymentId}`);
        const data = await response.json();

        setStatus(data);
        if (data.paid) {
          onSuccess?.();
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
        onError?.(error);
      } finally {
        setIsChecking(false);
      }
    };

    // Check immediately
    checkStatus();

    // Then check every 5 seconds
    const interval = setInterval(checkStatus, 5000);

    // Clean up on unmount
    return () => clearInterval(interval);
  }, [paymentId, onSuccess, onError]);

  const handleCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md max-w-md mx-auto text-center">
      <h2 className="text-xl font-bold mb-4">Pagamento PIX</h2>
      <p className="text-gray-600 mb-4">
        Valor a pagar: R$ {amount.toFixed(2)}
      </p>

      {qrCodeImage && (
        <div className="mb-4">
          <img
            src={`data:image/png;base64,${qrCodeImage}`}
            alt="QR Code PIX"
            className="mx-auto"
             {status?.paid ? (
               <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                 <p className="font-bold">Pagamento confirmado!</p>
                 <p>O pedido será preparado em breve.</p>
               </div>
             ) : (
            style={{ maxWidth: "200px" }}
          />
        </div>
      )}

      <div className="mb-4">
        <button
          onClick={handleCopyClick}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
        >
          {copied ? "Código Copiado!" : "Copiar Código PIX"}
        </button>
      </div>

      <div className="text-sm text-gray-500 mb-4">
        <p>1. Abra o app do seu banco</p>
        <p>2. Escolha pagar com PIX</p>
        <p>3. Escaneie o QR code ou cole o código PIX</p>
        <p>4. Confirme o pagamento</p>
      </div>

      <a
        href={paymentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-600 underline block mt-4"
      >
        Abrir página de pagamento
      </a>
    </div>
  );
};
               {isChecking ? (
                 <div className="text-sm text-gray-600 mb-4">
                   <p>Verificando status do pagamento...</p>
                 </div>
               ) : status && !status.paid && (
                 <div className="text-sm text-gray-600 mb-4">
                   <p>Status: {status.status_detail || status.status}</p>
                 </div>
               )}
