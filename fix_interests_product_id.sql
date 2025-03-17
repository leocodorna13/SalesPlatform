
-- Verificar e corrigir o tipo da coluna product_id na tabela interests
DO 1907
BEGIN
  -- Verificar se a coluna product_id existe na tabela interests
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'interests' AND column_name = 'product_id'
  ) THEN
    -- Verificar se o tipo da coluna é UUID
    IF (
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'interests' AND column_name = 'product_id'
    ) != 'uuid' THEN
      -- Alterar o tipo da coluna para UUID
      ALTER TABLE interests
      ALTER COLUMN product_id TYPE uuid USING product_id::uuid;
    END IF;
  END IF;
END 1907;

