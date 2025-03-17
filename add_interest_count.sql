-- Verificar se a coluna interest_count existe na tabela products
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'interest_count'
    ) THEN
        -- Adicionar a coluna interest_count se não existir
        ALTER TABLE products ADD COLUMN interest_count INTEGER DEFAULT 0;
        
        -- Atualizar o contador de interesses com base nos registros existentes
        UPDATE products p
        SET interest_count = (
            SELECT COUNT(*)
            FROM interested_users i
            WHERE i.product_id = p.id
        );
    END IF;
END $$;
