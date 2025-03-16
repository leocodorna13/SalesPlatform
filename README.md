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
