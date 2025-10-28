import { MenuItem } from "./types";

export const RESTAURANT_PHONE_NUMBER = "5581995238551"; // Replace with actual WhatsApp number
export const RESTAURANT_ADDRESS =
  "Rua,Prof.Rutilho, 2 - Coqueiral, Recife - PE, 50791-040";
export const PIX_QR_CODE_URL = "https://picsum.photos/250"; // Placeholder for QR code image

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 1,
    name: "Hambúrguer Clássico",
    description: "Pão, carne, queijo, alface, tomate e molho especial.",
    price: 25.5,
    category: "Hambúrgueres",
    image: "https://picsum.photos/id/1060/400/300",
    flavors: ["Bovino", "Frango", "Vegetariano"],
  },
  {
    id: 2,
    name: "Hambúrguer Duplo Bacon",
    description: "Pão, duas carnes, dobro de bacon, queijo cheddar e barbecue.",
    price: 32.0,
    category: "Hambúrgueres",
    image: "https://picsum.photos/id/312/400/300",
    flavors: ["Bovino", "Frango"],
  },
  {
    id: 3,
    name: "Pizza Margherita",
    description: "Molho de tomate, mussarela fresca e manjericão.",
    price: 45.0,
    category: "Pizzas",
    image: "https://picsum.photos/id/292/400/300",
    flavors: ["Tamanho P", "Tamanho M", "Tamanho G"],
  },
  {
    id: 4,
    name: "Pizza Calabresa",
    description: "Molho de tomate, mussarela, calabresa e cebola.",
    price: 48.5,
    category: "Pizzas",
    image: "https://picsum.photos/id/102/400/300",
    flavors: ["Tamanho P", "Tamanho M", "Tamanho G"],
  },
  {
    id: 5,
    name: "Batata Frita",
    description: "Porção generosa de batatas fritas crocantes.",
    price: 15.0,
    category: "Acompanhamentos",
    image: "https://picsum.photos/id/1084/400/300",
    flavors: ["Pequena", "Média", "Grande"],
  },
  {
    id: 6,
    name: "Refrigerante Lata",
    description: "Coca-Cola, Guaraná ou Soda.",
    price: 6.0,
    category: "Bebidas",
    image: "https://picsum.photos/id/119/400/300",
    flavors: ["Coca-Cola", "Guaraná", "Fanta", "Sprite"],
  },
];
