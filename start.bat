@echo off
REM Script para executar o projeto El Sabor no Windows
REM Este script inicia tanto o backend quanto o frontend

echo 🍽️  Iniciando El Sabor - Sistema de Pedidos de Restaurante
echo ==================================================

REM Verificar se Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js não está instalado. Por favor, instale o Node.js primeiro.
    pause
    exit /b 1
)

REM Verificar se npm está instalado
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm não está instalado. Por favor, instale o npm primeiro.
    pause
    exit /b 1
)

echo ✅ Node.js e npm encontrados

REM Instalar dependências do backend se necessário
if not exist "node_modules\express\package.json" (
    echo 📦 Instalando dependências do backend...
    npm install express cors
)

REM Instalar dependências do frontend se necessário
if not exist "node_modules\react\package.json" (
    echo 📦 Instalando dependências do frontend...
    npm install
)

echo 🚀 Iniciando servidor backend na porta 3001...
start "Backend Server" cmd /k "node server.js"

REM Aguardar um pouco para o backend inicializar
timeout /t 3 /nobreak >nul

echo 🚀 Iniciando servidor frontend na porta 5173...
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ✅ Servidores iniciados com sucesso!
echo 🌐 Frontend: http://localhost:5173
echo 🔧 Backend API: http://localhost:3001/api
echo.
echo 📱 Credenciais de acesso:
echo    Administrador: admin / admin123
echo    Entregador: driver / driver123
echo.
echo ⏹️  Para parar os servidores, feche as janelas do terminal
pause
