import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import {
  DeliveryType,
  PaymentMethod,
  CartItem,
  Order,
  User,
  translatePaymentMethod,
  translateDeliveryType,
} from "../types";
import { RESTAURANT_ADDRESS, RESTAURANT_PHONE_NUMBER } from "../constants";
import { submitOrder } from "../services/api";
import { createPixPayment, checkPaymentStatus } from "../services/paymentApi";
import { TrashIcon, WhatsAppIcon } from "../components/icons";
import { validateAddress } from "../utils/addressValidation";

type CheckoutStep = "LOGIN" | "DELIVERY" | "PAYMENT" | "CONFIRMATION";

const CheckoutPage: React.FC = () => {
  const {
    cart,
    cartTotal,
    cartCount,
    updateQuantity,
    removeFromCart,
    login,
    user,
    clearCart,
  } = useAppContext();
  const navigate = useNavigate();

  const [step, setStep] = useState<CheckoutStep>("LOGIN");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(
    DeliveryType.PICKUP
  );
  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    PaymentMethod.CASH
  );
  const [observations, setObservations] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [isLoadingPix, setIsLoadingPix] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<any>(null);

  const generatePixPayment = async (orderId: string) => {
    setIsLoadingPix(true);
    try {
      // Create payment with customer info
      const data = await createPixPayment(orderId, {
        name: name.trim(),
        phone: phone,
      });
      setPixData(data);
      setPaymentStatus({ paid: false });
    } catch (error) {
      console.error("Failed to generate PIX payment:", error);
      alert("Erro ao gerar pagamento PIX. Tente novamente.");
    } finally {
      setIsLoadingPix(false);
    }
  };

  const checkPixPaymentStatus = async () => {
    if (!pixData?.transactionId) return;

    setIsLoadingPix(true);
    try {
      const status = await checkPaymentStatus(pixData.transactionId);
      setPaymentStatus(status);

      if (status.paid) {
        // Update order status or proceed with confirmation
        setStep("CONFIRMATION");
      }
    } catch (error) {
      console.error("Failed to check payment status:", error);
      alert("Erro ao verificar status do pagamento. Tente novamente.");
    } finally {
      setIsLoadingPix(false);
    }
  };

  if (cartCount === 0 && step !== "CONFIRMATION") {
    navigate("/");
  }

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() === "") {
      alert("Por favor, insira seu nome.");
      return;
    }
    if (phone.length >= 10) {
      login(name.trim(), phone);
      setStep("DELIVERY");
    } else {
      alert("Por favor, insira um telefone válido com pelo menos 10 dígitos.");
    }
  };

  const handleAddressValidation = async () => {
    if (address.trim() === "") return;

    setIsValidatingAddress(true);
    setAddressError("");
    setAddressSuggestions([]);

    try {
      const result = await validateAddress(address);

      if (!result.isValid) {
        setAddressError(result.error || "Endereço inválido");
        setAddressSuggestions(result.suggestions);
      } else {
        setAddressError("");
        setAddressSuggestions(result.suggestions);
      }
    } catch (error) {
      setAddressError("Erro ao validar endereço");
    } finally {
      setIsValidatingAddress(false);
    }
  };

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Comentado temporariamente - apenas retirada disponível
    // if (deliveryType === DeliveryType.DELIVERY) {
    //   if (address.trim() === '') {
    //     alert('Por favor, insira o endereço de entrega.');
    //     return;
    //   }
    //
    //   // Validar endereço antes de prosseguir
    //   await handleAddressValidation();
    //
    //   if (addressError) {
    //     alert('Por favor, corrija o endereço antes de continuar.');
    //     return;
    //   }
    // }

    setStep("PAYMENT");
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Erro: usuário não encontrado. Retornando ao início.");
      setStep("LOGIN");
      return;
    }

    setIsLoading(true);
    try {
      const finalUser: User =
        deliveryType === DeliveryType.DELIVERY ? { ...user, address } : user;
      const newOrder = await submitOrder({
        user: finalUser,
        items: cart,
        total: cartTotal,
        deliveryType,
        paymentMethod,
        observations: observations.trim() || undefined,
      });
      setConfirmedOrder(newOrder);

      if (paymentMethod === PaymentMethod.PIX) {
        await generatePixPayment(newOrder.id);
      } else {
        clearCart();
        setStep("CONFIRMATION");
      }
    } catch (error) {
      console.error("Failed to submit order", error);
      alert("Não foi possível processar seu pedido. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const generateWhatsAppMessage = () => {
    if (!confirmedOrder) return "";
    let message = `Olá, gostaria de fazer um pedido!\n\n`;
    message += `*Cliente:* ${confirmedOrder.user.name}\n`;
    message += `*Telefone:* ${confirmedOrder.user.phone}\n\n`;
    message += `*Itens:*\n`;
    confirmedOrder.items.forEach((item) => {
      const flavorText = item.selectedFlavor ? ` (${item.selectedFlavor})` : "";
      message += ` - ${item.quantity}x ${item.name}${flavorText}\n`;
    });
    message += `\n*Total:* ${confirmedOrder.total.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })}\n`;
    message += `*Pagamento:* ${translatePaymentMethod(
      confirmedOrder.paymentMethod
    )}\n`;
    message += `*Entrega:* ${translateDeliveryType(
      confirmedOrder.deliveryType
    )}\n`;
    // Comentado temporariamente - apenas retirada disponível
    // if (confirmedOrder.deliveryType === DeliveryType.DELIVERY) {
    //     message += `*Endereço:* ${confirmedOrder.user.address}\n`;
    // }
    if (confirmedOrder.observations) {
      message += `*Observações:* ${confirmedOrder.observations}\n`;
    }
    message += `\nObrigado!`;
    return encodeURIComponent(message);
  };

  const renderCartSummary = () => (
    <div className="w-full lg:w-2/5 lg:ml-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Seu Pedido</h2>
        {cart.map((item: CartItem) => (
          <div
            key={`${item.id}-${item.selectedFlavor || "default"}`}
            className="flex justify-between items-center mb-4"
          >
            <div>
              <p className="font-semibold">{item.name}</p>
              {item.selectedFlavor && (
                <p className="text-sm text-blue-600">
                  Sabor: {item.selectedFlavor}
                </p>
              )}
              <p className="text-sm text-gray-600">
                {item.price.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            </div>
            <div className="flex items-center">
              <input
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  updateQuantity(item.id, parseInt(e.target.value))
                }
                className="w-16 text-center border rounded-md"
              />
              <button
                onClick={() => removeFromCart(item.id)}
                className="ml-2 text-red-500 hover:text-red-700"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>
              {cartTotal.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen container mx-auto p-4 md:p-8">
      <button
        onClick={() => navigate("/")}
        className="text-orange-600 hover:text-orange-800 mb-6"
      >
        &larr; Voltar ao Cardápio
      </button>
      <div className="flex flex-col lg:flex-row">
        <div className="w-full lg:w-3/5">
          {step === "LOGIN" && (
            <form
              onSubmit={handlePhoneSubmit}
              className="bg-white p-8 rounded-lg shadow-md"
            >
              <h2 className="text-3xl font-bold mb-6">Identificação</h2>
              <p className="mb-4 text-gray-600">
                Para começar, por favor, insira seus dados.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full p-3 border rounded-md focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(99) 99999-9999"
                  className="w-full p-3 border rounded-md focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-orange-600 text-white font-bold py-3 mt-6 rounded-md hover:bg-orange-700 transition-colors"
              >
                Continuar
              </button>
            </form>
          )}

          {step === "DELIVERY" && (
            <form
              onSubmit={handleDeliverySubmit}
              className="bg-white p-8 rounded-lg shadow-md"
            >
              <h2 className="text-3xl font-bold mb-6">Retirada no Local</h2>
              <div className="space-y-4">
                {/* Comentado temporariamente - apenas retirada disponível */}
                {/* <label className={`block p-4 border rounded-md cursor-pointer ${deliveryType === DeliveryType.DELIVERY ? 'border-orange-500 ring-2 ring-orange-500' : ''}`}>
                                <input type="radio" name="deliveryType" value={DeliveryType.DELIVERY} checked={deliveryType === DeliveryType.DELIVERY} onChange={() => setDeliveryType(DeliveryType.DELIVERY)} className="hidden" />
                                <span className="text-lg font-semibold">Receber em casa (Entrega)</span>
                                <p className="text-gray-600">Nós levamos até você.</p>
                            </label> */}
                <label
                  className={`block p-4 border rounded-md cursor-pointer border-orange-500 ring-2 ring-orange-500`}
                >
                  <input
                    type="radio"
                    name="deliveryType"
                    value={DeliveryType.PICKUP}
                    checked={true}
                    onChange={() => setDeliveryType(DeliveryType.PICKUP)}
                    className="hidden"
                  />
                  <span className="text-lg font-semibold">
                    Retirar no local
                  </span>
                  <p className="text-gray-600">
                    Endereço: {RESTAURANT_ADDRESS}
                  </p>
                </label>
              </div>

              {/* Comentado temporariamente - validação de endereço */}
              {/* {deliveryType === DeliveryType.DELIVERY && (
                            <div className="mt-6">
                                <label className="block text-lg font-semibold mb-2">Endereço de Entrega</label>
                                <div className="space-y-2">
                                    <input 
                                        type="text" 
                                        value={address} 
                                        onChange={(e) => {
                                            setAddress(e.target.value);
                                            setAddressError('');
                                            setAddressSuggestions([]);
                                        }} 
                                        placeholder="Rua, Número, Bairro, CEP (ex: 50791-040)" 
                                        className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-orange-500 ${addressError ? 'border-red-500' : ''}`} 
                                        required 
                                    />
                                    
                                    {address.trim() && (
                                        <button 
                                            type="button"
                                            onClick={handleAddressValidation}
                                            disabled={isValidatingAddress}
                                            className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:bg-gray-400"
                                        >
                                            {isValidatingAddress ? 'Validando...' : 'Validar Endereço'}
                                        </button>
                                    )}
                                    
                                    {addressError && (
                                        <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                                            {addressError}
                                        </div>
                                    )}
                                    
                                    {addressSuggestions.length > 0 && (
                                        <div className="bg-green-50 p-3 rounded">
                                            <p className="text-green-800 text-sm font-medium mb-2">Sugestões de endereço:</p>
                                            {addressSuggestions.map((suggestion, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => {
                                                        setAddress(suggestion);
                                                        setAddressError('');
                                                        setAddressSuggestions([]);
                                                    }}
                                                    className="block w-full text-left text-green-700 text-sm hover:bg-green-100 p-1 rounded"
                                                >
                                                    ✓ {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )} */}

              <button
                type="submit"
                className="w-full bg-orange-600 text-white font-bold py-3 mt-6 rounded-md hover:bg-orange-700 transition-colors"
              >
                Ir para Pagamento
              </button>
            </form>
          )}

          {step === "PAYMENT" && (
            <form
              onSubmit={handlePaymentSubmit}
              className="bg-white p-8 rounded-lg shadow-md"
            >
              <h2 className="text-3xl font-bold mb-6">Forma de Pagamento</h2>
              <div className="space-y-4">
                {Object.values(PaymentMethod).map((method) => (
                  <label
                    key={method}
                    className={`block p-4 border rounded-md cursor-pointer ${
                      paymentMethod === method
                        ? "border-orange-500 ring-2 ring-orange-500"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)}
                      className="hidden"
                    />
                    <span className="text-lg font-semibold">
                      {translatePaymentMethod(method)}
                    </span>
                    <p className="text-gray-600">
                      {method !== "PIX"
                        ? "Pague na entrega/retirada"
                        : "Pagamento antecipado via QR Code"}
                    </p>
                  </label>
                ))}
              </div>
              {paymentMethod === PaymentMethod.PIX && confirmedOrder && (
                <div className="mt-6 text-center" id="pix-payment">
                  <p className="mb-2">Escaneie o QR Code para pagar:</p>
                  {isLoadingPix ? (
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="w-48 h-48 bg-gray-200 rounded-lg"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mt-4"></div>
                    </div>
                  ) : pixData ? (
                    <>
                      <img
                        src={`data:image/png;base64,${pixData.qrCode.image}`}
                        alt="PIX QR Code"
                        className="mx-auto border rounded-lg shadow-md w-48 h-48"
                      />
                      <div className="mt-4 space-y-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(pixData.qrCode.code);
                            alert("Código PIX copiado!");
                          }}
                          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                        >
                          Copiar código PIX
                        </button>
                        <p className="text-sm text-gray-500">
                          Expira em:{" "}
                          {new Date(pixData.expiresIn).toLocaleString()}
                        </p>
                        {paymentStatus && !paymentStatus.paid && (
                          <button
                            onClick={checkPixPaymentStatus}
                            className="text-blue-500 hover:text-blue-600"
                          >
                            Verificar pagamento
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-red-500">
                      Erro ao gerar QR Code PIX. Tente novamente.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-6">
                <label className="block text-lg font-semibold mb-2">
                  Observações (Opcional)
                </label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Ex: Sem cebola, bem temperado, etc..."
                  className="w-full p-3 border rounded-md focus:ring-2 focus:ring-orange-500"
                  rows={3}
                  maxLength={200}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {observations.length}/200 caracteres
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 text-white font-bold py-3 mt-6 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
              >
                {isLoading ? "Processando..." : "Finalizar Pedido"}
              </button>
            </form>
          )}

          {step === "CONFIRMATION" && confirmedOrder && (
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
              <h2 className="text-3xl font-bold mb-4 text-green-600">
                Pedido Confirmado!
              </h2>
              <p className="text-gray-700 mb-6">
                Seu pedido{" "}
                <span className="font-bold">
                  #{confirmedOrder.id.slice(-6)}
                </span>{" "}
                foi recebido. Para concluir, envie a mensagem gerada para nosso
                WhatsApp.
              </p>
              <a
                href={`https://wa.me/${RESTAURANT_PHONE_NUMBER}?text=${generateWhatsAppMessage()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-green-500 text-white font-bold py-4 px-8 rounded-lg hover:bg-green-600 transition-colors text-lg"
              >
                <WhatsAppIcon className="w-7 h-7 mr-3" /> Enviar Pedido via
                WhatsApp
              </a>
              <p className="text-sm text-gray-500 mt-4">
                Você receberá atualizações sobre o status do seu pedido por lá.
              </p>
            </div>
          )}
        </div>
        {step !== "CONFIRMATION" && renderCartSummary()}
      </div>
    </div>
  );
};

export default CheckoutPage;
