# Site de Vendas - Plataforma de Desapego

Site para venda de produtos pessoais de desapego com gerenciamento administrativo. Construído com Astro 5, Tailwind CSS 4 e Supabase.

## O Que é Este Projeto

Esta é uma plataforma simples para venda de produtos de desapego pessoal. O fluxo de funcionamento é:

1. O administrador configura as informações da loja (contato, WhatsApp)
2. Cadastra produtos com preços, descrições e fotos
3. Compartilha o link da loja com pessoas interessadas
4. Os visitantes navegam pelos produtos e clicam em "tenho interesse"
5. O administrador recebe mensagens no WhatsApp com o link do produto
6. A negociação acontece diretamente via WhatsApp

O objetivo é facilitar a venda de itens pessoais de forma simples e direta, sem intermediários ou comissões.

## Planos Futuros - Sistema Multi-Tenant

Estamos planejando evoluir esta plataforma para um sistema multi-tenant, onde:

- Qualquer pessoa poderá criar sua própria loja de desapego
- Cada loja terá seu próprio URL, produtos e configurações
- O sistema será monetizado via assinaturas com Stripe
- Diferentes planos oferecerão limites variados de produtos e recursos

Esta evolução permitirá que a plataforma atual se torne um SaaS (Software as a Service) para criação de lojas de desapego.

## Funcionalidades

- Exibição de produtos por categoria
- Área administrativa para gerenciamento de produtos
- Upload de múltiplas fotos
- Marcação automática de produtos vendidos
- Rastreamento de interesse nos produtos
- Experiência otimizada para dispositivos móveis

## Tecnologias

- Astro 5 (framework web)
- Tailwind CSS 4 (estilização)
- Supabase (banco de dados, autenticação e armazenamento)
- TypeScript (segurança de tipos)

## Como executar

1. Instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas credenciais do Supabase
```

3. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

4. Para build de produção:
```bash
npm run build
```

## Hospedagem

Este projeto está configurado para ser hospedado no Cloudflare Pages.

### Deploy no Cloudflare Pages

1. Instale a CLI do Cloudflare (Wrangler):
```bash
npm install -g wrangler
```

2. Faça login na sua conta Cloudflare:
```bash
wrangler login
```

3. Build do projeto:
```bash
npm run build
```

4. Deploy para Cloudflare Pages:
```bash
wrangler pages deploy dist
```

5. Configure as variáveis de ambiente no dashboard do Cloudflare Pages:
   - `SUPABASE_URL`: URL da sua instância Supabase
   - `SUPABASE_ANON_KEY`: Chave anônima do Supabase

### Configuração de Domínio Personalizado

1. Acesse o dashboard do Cloudflare Pages
2. Selecione seu projeto
3. Vá para "Custom domains"
4. Adicione seu domínio personalizado
5. Siga as instruções para configurar os registros DNS

### Resolução de Problemas

- **Erro de CORS**: Verifique se sua instância Supabase tem as origens corretas configuradas
- **Problemas com imagens**: Certifique-se de que o bucket do Supabase está configurado como público
- **Erros de build**: Verifique os logs de build no dashboard do Cloudflare Pages
