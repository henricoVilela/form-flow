CREATE TABLE responses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id         UUID NOT NULL REFERENCES forms(id),
    form_version_id UUID NOT NULL REFERENCES form_versions(id),
    payload         JSONB NOT NULL,
    metadata        JSONB,
    submitted_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_responses_form_id         ON responses(form_id);
CREATE INDEX idx_responses_form_version_id ON responses(form_version_id);
CREATE INDEX idx_responses_submitted_at    ON responses(submitted_at);
CREATE INDEX idx_responses_payload         ON responses USING GIN(payload);
