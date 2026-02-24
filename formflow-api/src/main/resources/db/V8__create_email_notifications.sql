CREATE TABLE email_notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES responses(id),
    recipient   VARCHAR(255) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts    INTEGER NOT NULL DEFAULT 0,
    sent_at     TIMESTAMP,
    error       TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT chk_email_notifications_status CHECK (status IN ('pending', 'sent', 'failed'))
);

CREATE INDEX idx_email_notifications_response_id ON email_notifications(response_id);
CREATE INDEX idx_email_notifications_status      ON email_notifications(status);
CREATE INDEX idx_email_notifications_created_at  ON email_notifications(created_at);
