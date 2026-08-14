# El Sabor - Sistema de Pedidos de Restaurante

Sistema completo de pedidos para restaurante com frontend React e backend Express.js.

## 🚀 Funcionalidades

### Frontend

- **Cardápio dinâmico** com categorias organizadas
- **Carrinho de compras** com persistência local
- **Sistema de checkout** com múltiplas formas de pagamento
- **Dashboard administrativo** para gerenciar pedidos
- **Gerenciamento de cardápio** - adicionar, editar e excluir itens
- **Dashboard do entregador** para acompanhar entregas

# El Sabor - Sistema de Pedidos de Restaurante

Projeto com frontend em React + Vite e backend em Node/Express. Este README foi atualizado para explicar como limpar arquivos de teste, executar localmente (Windows PowerShell) e as opções de deploy (Vercel para frontend e alternativas para backend).

---

## Limpeza de arquivos desnecessários

Há alguns arquivos de teste e arquivos auxiliares que normalmente não precisam ir para produção. Eles estão listados abaixo; você pode removê-los localmente com os comandos indicados.

Arquivos sugeridos para remoção:

- `test-payment.js`, `test-payment-2.js`, ..., `test-payment-8.js` (scripts de teste locais)
- `package-backend.json` (cópia alternativa do package.json)

Comandos PowerShell para remover (execute na raiz do projeto):

```powershell
Remove-Item .\test-payment*.js -Force -ErrorAction SilentlyContinue
Remove-Item .\package-backend.json -Force -ErrorAction SilentlyContinue
```

Observação: eu tentei automatizar a remoção, mas preferi te fornecer os comandos para confirmar antes de excluir. Se quiser que eu faça a remoção automaticamente, confirme e eu removo estes arquivos.

---

## Variáveis de ambiente necessárias

Crie um arquivo `.env` na raiz (já existe `.env.example`) com pelo menos as seguintes chaves:

```env
PORT=3001
MERCADO_PAGO_ACCESS_TOKEN=SEU_TOKEN_AQUI
# Outras variáveis (se aplicáveis)
```

Nunca comite tokens reais em repositórios públicos.

---

## Como rodar localmente (Windows PowerShell)

1. Instale dependências (raiz do projeto):

```powershell
npm install
```

2. Rodar o backend em modo desenvolvimento

Opção (recomendada para desenvolvimento):

```powershell
npm run dev:server
```

Esse script usa `ts-node-dev` (veja `package.json`) e vai recarregar o servidor quando houver mudanças. Se preferir rodar o servidor compilado, rode:

```powershell
npm run build:server
node dist/server.js
```

O backend por padrão escuta na porta informada em `process.env.PORT` (padrão 3001). A API base é `http://localhost:3001/api`.

3. Rodar o frontend

```powershell
npm run dev
```

O Vite normalmente roda em `http://localhost:5173`.

4. Testar o fluxo de pagamento PIX e Integrações Realizadas

- No checkout do frontend, escolha PIX como forma de pagamento e finalize o pedido.
- O sistema gerará o QR Code e o código Pix Copia e Cola, travando os campos para evitar re-submissões duplicadas.
- **Polling Automático:** O frontend consulta automaticamente o backend a cada 5 segundos para verificar o status de aprovação do Pix. Caso aprovado, o carrinho é limpo e o usuário é redirecionado para a página de confirmação.
- **Webhook de Produção:** O backend possui a rota `POST /api/payments/webhook` configurada para receber notificações de pagamento do Mercado Pago em tempo real e atualizar a ordem para `ACCEPTED` mesmo se o cliente fechar a página.
- **Verificação Manual:** Há também um link para verificação manual no checkout e o endpoint de consulta no backend:

  GET `http://localhost:3001/api/payments/:paymentId/status`

  Esse endpoint consulta a API do Mercado Pago e retorna um JSON com `status`, `statusDetail` e `paid`.

Observação sobre sandbox: para testes sem movimentação real, use o modo sandbox/ambiente de testes do Mercado Pago (consulte a documentação do Mercado Pago para credenciais de teste e comportamento do PIX em sandbox).

---

## Scripts úteis (do `package.json`)

- `npm run dev` — roda o frontend (vite)
- `npm run build` — roda `tsc` e `vite build` (gera `dist` e ativos)
- `npm run dev:server` — roda o backend com recarga (ts-node-dev)
- `npm run build:server` — compila o código do servidor (usado para produção)
- `npm run preview` — pré-visualiza build do frontend

---

## Deploy — opções e recomendações

Opção A — Deploy simples (recomendado):

- Deploy do frontend no Vercel (fácil) e deploy do backend em um serviço de Node (Railway, Render, Fly, Heroku, DigitalOcean App Platform etc.).

Frontend (Vercel):

1. Conecte o repositório Git ao Vercel.
2. Em "Project Settings", configure:
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Adicione variáveis de ambiente do front caso use (tipicamente não se coloca token de MP no frontend).
4. Deploy.

Backend (Railway / Render / Fly):

1. Escolha um provedor (Railway é simples para projetos Node).
2. Configure os secrets/ENV vars (MERCADO_PAGO_ACCESS_TOKEN, PORT).
3. Configure o comando de start (ex.: `npm run build:server && node dist/server.js` ou `npm run dev:server` para ambiente de staging).

Opção B — Deploy tudo no Vercel (avançado):

- É possível adaptar o backend para API Routes do Vercel (cada endpoint vira uma função serverless em `/api/*`). Isso exige reorganizar `server.js` em handlers serverless ou usar uma biblioteca como `vercel-node-server` para compatibilidade. Eu não recomendo para quem precisa de conexões persistentes ou de performance consistente para WebSockets/long-polling.

Observação de segurança: nunca exponha `MERCADO_PAGO_ACCESS_TOKEN` no frontend. Mantenha-o em variáveis de ambiente do servidor.

---

## Verificação rápida pós-deploy

1. Acesse o frontend hospedado (Vercel) e crie um pedido pelo fluxo normal.
2. Gere o QR PIX, escaneie e confirme o pagamento (em sandbox use as credenciais de teste do Mercado Pago).
3. O checkout deve mudar para a tela de confirmação automaticamente graças ao polling integrado.
4. Caso queira inspecionar manualmente, consulte o endpoint `GET /api/payments/:paymentId/status` para verificar se o status foi atualizado para `approved`.

---

## Limpeza e próximo passo

Se quiser, eu posso:

- Remover os arquivos de teste automaticamente (executei uma tentativa local — posso finalizar se você autorizar).
- Converter o backend para rotas serverless para deploy no Vercel (se preferir manter tudo em um só lugar).

Diga qual opção prefere e eu executo o próximo passo.

---

## Licença

Este projeto está sob a licença MIT.

### Saúde

- `GET /api/health` - Verificar status da API

## 👤 Credenciais de Acesso

### Administrador

- **Usuário:** admin
- **Senha:** admin123

### Entregador

- **Usuário:** driver
- **Senha:** driver123

## 🎯 Como Usar

### 1. Gerenciar Cardápio

1. Acesse o dashboard administrativo (`/admin/dashboard`)
2. Clique em "Gerenciar Cardápio"
3. Adicione, edite ou exclua itens do cardápio
4. As mudanças são salvas automaticamente no backend

### 2. Processar Pedidos

1. No dashboard administrativo, visualize todos os pedidos
2. Aceite ou cancele pedidos pendentes
3. Atualize o status conforme o progresso (aceito → enviado/retirada → entregue)
4. Imprima tickets automaticamente quando aceitar pedidos

### 3. Acompanhar Entregas

1. Acesse o dashboard do entregador (`/driver/dashboard`)
2. Visualize pedidos em andamento
3. Atualize status de entrega

## 🔄 Migração de Dados

O sistema migrou do localStorage para um backend real:

- **Cardápio:** Agora é gerenciado via API
- **Pedidos:** Persistidos no servidor
- **Dados:** Salvos em arquivos JSON no diretório `data/`

## 🚨 Solução de Problemas

### Backend não conecta

- Verifique se a porta 3001 está disponível
- Confirme se o Node.js está instalado
- Execute `node server.js` no terminal

### Frontend não carrega dados

- Verifique se o backend está rodando
- Confirme se a URL da API está correta (`http://localhost:3001/api`)
- Verifique o console do navegador para erros

### Erro de CORS

- O backend já está configurado com CORS
- Se houver problemas, verifique se o servidor está rodando na porta correta

## 📝 Próximos Passos

- [ ] Implementar autenticação JWT
- [ ] Adicionar banco de dados (PostgreSQL/MongoDB)
- [ ] Implementar notificações em tempo real
- [ ] Adicionar relatórios de vendas
- [ ] Implementar sistema de avaliações
- [ ] Adicionar upload de imagens para o cardápio

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## Configuração de segurança obrigatória

O backend falha na inicialização quando `MERCADO_PAGO_ACCESS_TOKEN`,
`ADMIN_PASSWORD_HASH` ou `ADMIN_SESSION_SECRET` não estão configurados. Copie
`.env.example` para `.env` apenas no ambiente local e nunca versione o arquivo
resultante.

`ADMIN_PASSWORD_HASH` deve ter o formato `scrypt:<salt-hex>:<hash-hex>`. Gere o
salt com pelo menos 16 bytes aleatórios e derive um hash de pelo menos 32 bytes
com scrypt. `ADMIN_SESSION_SECRET` deve ser aleatório e ter no mínimo 32
caracteres. Configure `ALLOWED_ORIGINS` com as origens HTTPS reais do frontend,
separadas por vírgula.

Após aplicar esta atualização em um ambiente que já esteve publicado, rotacione
qualquer chave Gemini que tenha sido incluída no bundle e o token do Mercado
Pago caso seus prefixos ou respostas tenham aparecido em logs.
