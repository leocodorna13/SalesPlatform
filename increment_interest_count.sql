
CREATE OR REPLACE FUNCTION increment_interest_count(product_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS 1545
BEGIN
    UPDATE products
    SET interest_count = COALESCE(interest_count, 0) + 1
    WHERE id = product_id::uuid;
END;
1545;
