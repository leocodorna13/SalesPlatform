#!/bin/bash

# Configurações para o novo projeto
NEW_PROJECT_URL="https://qwshfqspoehiwujbwwld.supabase.co"
NEW_PROJECT_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3c2hmcXNwb2VoaXd1amJ3d2xkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjA1OTI2OCwiZXhwIjoyMDYxNjM1MjY4fQ.-yrGnAW9xY6DLe2kM-nac0RlB_NwZt0p1AFKv4JVwiA"
BACKUP_DIR="./supabase_backup_20250430"  # Ajuste para o diretório de backup correto

# Verificar se o diretório de backup existe
if [ ! -d "$BACKUP_DIR" ]; then
    echo "Diretório de backup não encontrado: $BACKUP_DIR"
    exit 1
fi

# Lista de tabelas principais (ajuste conforme necessário)
MAIN_TABLES=("site_settings" "categories" "products" "hero_images" "admins")

# Criar tabelas principais primeiro
for TABLE in "${MAIN_TABLES[@]}"; do
    if [ -f "$BACKUP_DIR/$TABLE.json" ]; then
        echo "Restaurando tabela principal: $TABLE"
        curl -X POST "$NEW_PROJECT_URL/rest/v1/$TABLE" \
            -H "apikey: $NEW_PROJECT_KEY" \
            -H "Authorization: Bearer $NEW_PROJECT_KEY" \
            -H "Content-Type: application/json" \
            -H "Prefer: resolution=merge-duplicates" \
            -d @"$BACKUP_DIR/$TABLE.json"
        echo ""
    else
        echo "Arquivo não encontrado para tabela: $TABLE"
    fi
done

# Restaurar tabelas com relacionamentos secundários
echo "Restaurando tabelas com relacionamentos..."
for TABLE in product_images interests; do
    if [ -f "$BACKUP_DIR/$TABLE.json" ]; then
        echo "Restaurando tabela: $TABLE"
        curl -X POST "$NEW_PROJECT_URL/rest/v1/$TABLE" \
            -H "apikey: $NEW_PROJECT_KEY" \
            -H "Authorization: Bearer $NEW_PROJECT_KEY" \
            -H "Content-Type: application/json" \
            -H "Prefer: resolution=merge-duplicates" \
            -d @"$BACKUP_DIR/$TABLE.json"
        echo ""
    else
        echo "Arquivo não encontrado para tabela: $TABLE"
    fi
done

# Restaurar todas as outras tabelas encontradas
echo "Restaurando outras tabelas encontradas..."
for JSON_FILE in "$BACKUP_DIR"/*.json; do
    FILENAME=$(basename "$JSON_FILE")
    TABLE="${FILENAME%.json}"
    
    # Pular arquivos que já foram processados ou que não são tabelas
    if [[ " ${MAIN_TABLES[@]} product_images interests schema_structure " =~ " $TABLE " ]]; then
        continue
    fi
    
    # Pular nomes de arquivo complexos que provavelmente não são tabelas
    if [[ $TABLE == *"{"* || $TABLE == *"}"* || $TABLE == *"\`"* || $TABLE == *":"* ]]; then
        continue
    fi
    
    echo "Tentando restaurar: $TABLE"
    curl -X POST "$NEW_PROJECT_URL/rest/v1/$TABLE" \
        -H "apikey: $NEW_PROJECT_KEY" \
        -H "Authorization: Bearer $NEW_PROJECT_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: resolution=merge-duplicates" \
        -d @"$JSON_FILE"
    echo ""
done

echo "Restauração concluída. Verifique no painel do Supabase se os dados foram importados corretamente."
echo "Você pode precisar ajustar manualmente relacionamentos, permissões ou funções específicas."