
-- Verificar o tipo da coluna id na tabela products
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'id';

