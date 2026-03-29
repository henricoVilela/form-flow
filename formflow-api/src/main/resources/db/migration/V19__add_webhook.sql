ALTER TABLE forms ADD COLUMN webhook_url VARCHAR(2048);

CREATE TABLE webhook_deliveries (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id              UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    response_id          UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    webhook_url          VARCHAR(2048) NOT NULL,
    payload              JSONB NOT NULL,
    status               VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempts             INTEGER NOT NULL DEFAULT 0,
    next_attempt_at      TIMESTAMP NOT NULL DEFAULT now(),
    last_response_status INTEGER,
    last_error           TEXT,
    created_at           TIMESTAMP NOT NULL DEFAULT now(),
    delivered_at         TIMESTAMP
);

CREATE INDEX idx_webhook_deliveries_status_next ON webhook_deliveries(status, next_attempt_at)
    WHERE status = 'PENDING';
