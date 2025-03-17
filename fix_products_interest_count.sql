
-- Verificar e corrigir a coluna interest_count na tabela products
DO 1907
BEGIN
  -- Verificar se a coluna interest_count existe na tabela products
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'interest_count'
  ) THEN
    -- Adicionar a coluna interest_count se não existir
    ALTER TABLE products
    ADD COLUMN interest_count integer DEFAULT 0;
  ELSE
    -- Verificar se o tipo da coluna é integer
    IF (
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'products' AND column_name = 'interest_count'
    ) != 'integer' THEN
      -- Alterar o tipo da coluna para integer
      ALTER TABLE products
      ALTER COLUMN interest_count TYPE integer USING interest_count::integer;
    END IF;
  END IF;
  
  -- Atualizar todos os valores NULL para 0
  UPDATE products
  SET interest_count = 0
  WHERE interest_count IS NULL;
END 1907;

