-- Simplify listing date_flexibility to a small, meaningful set:
--   exact | week | month
-- Old values map: 1week → week, 2weeks → month, 3days → exact (treated as exact).
-- Undated listings (NULL depart_date) are now first-class: the backend
-- surfaces them under every time filter (sorted last) instead of hiding them.
UPDATE listings SET date_flexibility = CASE date_flexibility
  WHEN '1week'  THEN 'week'
  WHEN '2weeks' THEN 'month'
  WHEN '3days'  THEN 'exact'
  ELSE date_flexibility
END;

-- Swap the CHECK constraint. Name is the Postgres default
-- (<table>_<column>_check); DROP IF EXISTS guards older installs where it
-- may have a different name.
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_date_flexibility_check;
ALTER TABLE listings ADD CONSTRAINT listings_date_flexibility_check
  CHECK (date_flexibility IN ('exact', 'week', 'month'));
