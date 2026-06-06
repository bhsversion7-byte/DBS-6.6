INSERT INTO currencies (currency_code, currency_name, symbol)
VALUES
  ('USD', 'US Dollar', '$'),
  ('EUR', 'Euro', '€'),
  ('GBP', 'Pound Sterling', '£'),
  ('JPY', 'Japanese Yen', '¥'),
  ('AUD', 'Australian Dollar', 'A$'),
  ('CAD', 'Canadian Dollar', 'C$'),
  ('CHF', 'Swiss Franc', 'CHF'),
  ('HKD', 'Hong Kong Dollar', 'HK$'),
  ('SGD', 'Singapore Dollar', 'S$'),
  ('CNY', 'Chinese Yuan', '¥')
ON CONFLICT (currency_code) DO NOTHING;

INSERT INTO fx_rates (
  base_currency,
  quote_currency,
  mid_rate,
  bid_rate,
  ask_rate,
  spread,
  source,
  timestamp
)
VALUES
  ('USD', 'EUR', 0.92340000, 0.92321532, 0.92358468, 0.00036936, 'demo-seed', now()),
  ('EUR', 'USD', 1.08290000, 1.08268342, 1.08311658, 0.00043316, 'demo-seed', now()),
  ('GBP', 'USD', 1.27080000, 1.27054584, 1.27105416, 0.00050832, 'demo-seed', now()),
  ('USD', 'JPY', 156.42000000, 156.38871600, 156.45128400, 0.06256800, 'demo-seed', now()),
  ('USD', 'CNY', 7.24280000, 7.24135144, 7.24424856, 0.00289712, 'demo-seed', now()),
  ('USD', 'HKD', 7.81210000, 7.81053758, 7.81366242, 0.00312484, 'demo-seed', now());
