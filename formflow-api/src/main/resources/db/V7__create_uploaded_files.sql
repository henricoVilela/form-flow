CREATE TABLE uploaded_files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id         UUID NOT NULL REFERENCES forms(id),
    response_id     UUID REFERENCES responses(id),
    original_name   VARCHAR(500) NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    size_bytes      BIGINT NOT NULL,
    storage_key     VARCHAR(500) NOT NULL UNIQUE,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    uploaded_at     TIMESTAMP NOT NULL DEFAULT now(),
    confirmed_at    TIMESTAMP,

    CONSTRAINT chk_uploaded_files_status CHECK (status IN ('pending', 'confirmed', 'deleted'))
);

CREATE INDEX idx_uploaded_files_form_id     ON uploaded_files(form_id);
CREATE INDEX idx_uploaded_files_response_id ON uploaded_files(response_id);
CREATE INDEX idx_uploaded_files_status      ON uploaded_files(status);
