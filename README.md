# Site de Vendas

Site para venda de produtos pessoais com gerenciamento administrativo. Construído com Astro 5, Tailwind CSS 4 e Supabase.

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
