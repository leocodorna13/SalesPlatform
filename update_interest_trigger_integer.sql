
-- Trigger para atualizar contador de interesse em tempo real (para IDs inteiros)
CREATE OR REPLACE FUNCTION update_interest_count()
RETURNS TRIGGER AS 1907
BEGIN
  -- Atualizar o contador de interesse na tabela products
  UPDATE products
  SET interest_count = (
    SELECT COUNT(*) 
    FROM interests 
    WHERE product_id = NEW.product_id
  )
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
1907 LANGUAGE plpgsql;

-- Criar o trigger
DROP TRIGGER IF EXISTS interest_count_trigger ON interests;
CREATE TRIGGER interest_count_trigger
AFTER INSERT ON interests
FOR EACH ROW
EXECUTE FUNCTION update_interest_count();

