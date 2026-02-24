CREATE TABLE form_versions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id     UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    version     INTEGER NOT NULL,
    schema      JSONB NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_form_versions_form_version UNIQUE (form_id, version)
);

CREATE INDEX idx_form_versions_form_id ON form_versions(form_id);
CREATE INDEX idx_form_versions_schema  ON form_versions USING GIN(schema);
