#!/bin/bash

# Configurações
SUPABASE_URL="https://ebfjtzvwkgnhzstlqjnz.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZmp0enZ3a2duaHpzdGxxam56Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjA5MDcwOCwiZXhwIjoyMDU3NjY2NzA4fQ.amsDQtk_HThgo0Q1mBUlYz5KQ6eL7cYjdD8hSIJCKlo"  # Service role key com permissões completas
DB_PASSWORD="m5Ggh51XzWnG8YQP"   # Senha do banco de dados
OUTPUT_DIR="./supabase_backup_$(date +%Y%m%d)"

# Criar diretório de backup
mkdir -p $OUTPUT_DIR

# Obter lista de tabelas
echo "Obtendo lista de tabelas..."
TABLES=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  | tr -d '[]"' | tr ',' '\n')

# Fazer backup de cada tabela
for TABLE in $TABLES; do
  echo "Fazendo backup da tabela: $TABLE"
  curl -s -X GET \
    "$SUPABASE_URL/rest/v1/$TABLE" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    > "$OUTPUT_DIR/$TABLE.json"
done

# Salvar estrutura do banco de dados (definições de tabelas)
echo "Salvando estrutura do banco de dados..."
curl -s -X GET \
  "$SUPABASE_URL/rest/v1/rpc/schema_structure" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' \
  > "$OUTPUT_DIR/schema_structure.json"

echo "Backup concluído em $OUTPUT_DIR"

# Adicionando informações para restauração futura
echo "Para restaurar este backup em um novo projeto Supabase:" > "$OUTPUT_DIR/README.txt"
echo "1. Crie um novo projeto no Supabase" >> "$OUTPUT_DIR/README.txt"
echo "2. Obtenha as credenciais do novo projeto" >> "$OUTPUT_DIR/README.txt"
echo "3. Para cada arquivo JSON neste diretório, use o comando:" >> "$OUTPUT_DIR/README.txt"
echo "   curl -X POST https://[NOVO_ID_PROJETO].supabase.co/rest/v1/[NOME_TABELA] \\" >> "$OUTPUT_DIR/README.txt"
echo "     -H \"apikey: [NOVA_API_KEY]\" \\" >> "$OUTPUT_DIR/README.txt"
echo "     -H \"Authorization: Bearer [NOVA_API_KEY]\" \\" >> "$OUTPUT_DIR/README.txt"
echo "     -H \"Content-Type: application/json\" \\" >> "$OUTPUT_DIR/README.txt"
echo "     -d @[NOME_TABELA].json" >> "$OUTPUT_DIR/README.txt"
echo "" >> "$OUTPUT_DIR/README.txt"
echo "ID do projeto original: ebfjtzvwkgnhzstlqjnz" >> "$OUTPUT_DIR/README.txt"
echo "Data do backup: $(date)" >> "$OUTPUT_DIR/README.txt"