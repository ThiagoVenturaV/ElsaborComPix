#!/bin/bash

# Script para executar o projeto El Sabor
# Este script inicia tanto o backend quanto o frontend

echo "🍽️  Iniciando El Sabor - Sistema de Pedidos de Restaurante"
echo "=================================================="

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado. Por favor, instale o Node.js primeiro."
    exit 1
fi

# Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não está instalado. Por favor, instale o npm primeiro."
    exit 1
fi

echo "✅ Node.js e npm encontrados"

# Instalar dependências do backend se necessário
if [ ! -d "node_modules" ] || [ ! -f "node_modules/express/package.json" ]; then
    echo "📦 Instalando dependências do backend..."
    npm install express cors
fi

# Instalar dependências do frontend se necessário
if [ ! -d "node_modules" ] || [ ! -f "node_modules/react/package.json" ]; then
    echo "📦 Instalando dependências do frontend..."
    npm install
fi

echo "🚀 Iniciando servidor backend na porta 3001..."
# Iniciar o backend em background
node server.js &
BACKEND_PID=$!

# Aguardar um pouco para o backend inicializar
sleep 3

echo "🚀 Iniciando servidor frontend na porta 5173..."
# Iniciar o frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Servidores iniciados com sucesso!"
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:3001/api"
echo ""
echo "📱 Credenciais de acesso:"
echo "   Administrador: admin / admin123"
echo "   Entregador: driver / driver123"
echo ""
echo "⏹️  Para parar os servidores, pressione Ctrl+C"

# Função para limpar processos quando o script for interrompido
cleanup() {
    echo ""
    echo "🛑 Parando servidores..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Servidores parados"
    exit 0
}

# Capturar sinal de interrupção
trap cleanup SIGINT SIGTERM

# Aguardar indefinidamente
wait
