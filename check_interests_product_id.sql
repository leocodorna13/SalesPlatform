
-- Verificar o tipo da coluna product_id na tabela interests
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'interests' AND column_name = 'product_id';

