-- migrations/001_create_fraud_tables.sql
CREATE TABLE IF NOT EXISTS fraud_scores (
  transaction_seq     BIGINT PRIMARY KEY,
  scored_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  model_version       TEXT NOT NULL,
  score               DOUBLE PRECISION NOT NULL,        -- P(FRAUD)
  decision            TEXT NOT NULL,                    -- ALLOW | REVIEW | BLOCK
  threshold_low       DOUBLE PRECISION NOT NULL,
  threshold_high      DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS fraud_explanations ( -- giải thích chi tiết
  transaction_seq     BIGINT PRIMARY KEY,
  scored_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  model_version       TEXT NOT NULL,
  reasons_json        JSONB NOT NULL                    -- top_reasons (list)
);

-- tăng tốc join/tra cứu
CREATE INDEX IF NOT EXISTS idx_fraud_scores_scored_at ON fraud_scores (scored_at);
