Para restaurar este backup em um novo projeto Supabase:
1. Crie um novo projeto no Supabase
2. Obtenha as credenciais do novo projeto
3. Para cada arquivo JSON neste diretório, use o comando:
   curl -X POST https://[NOVO_ID_PROJETO].supabase.co/rest/v1/[NOME_TABELA] \
     -H "apikey: [NOVA_API_KEY]" \
     -H "Authorization: Bearer [NOVA_API_KEY]" \
     -H "Content-Type: application/json" \
     -d @[NOME_TABELA].json

ID do projeto original: ebfjtzvwkgnhzstlqjnz
Data do backup: Wed Apr 30 22:25:38 -03 2025
