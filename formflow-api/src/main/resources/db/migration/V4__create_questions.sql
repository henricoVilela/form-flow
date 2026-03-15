CREATE TABLE questions (
    id              UUID PRIMARY KEY,
    form_version_id UUID NOT NULL REFERENCES form_versions(id) ON DELETE CASCADE,
    form_id         UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    section_id      VARCHAR(100) NOT NULL,
    type            VARCHAR(50) NOT NULL,
    document_type   VARCHAR(50),
    label           TEXT NOT NULL,
    order_index     INTEGER NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT chk_questions_type CHECK (type IN (
        'short_text', 'long_text', 'email', 'phone', 'url',
        'number', 'single_choice', 'multi_choice', 'dropdown',
        'date', 'file_upload', 'statement', 'scale'
    )),

    CONSTRAINT chk_questions_document_type CHECK (
        document_type IS NULL OR document_type IN ('cpf', 'cnpj')
    )
);

CREATE INDEX idx_questions_form_version_id ON questions(form_version_id);
CREATE INDEX idx_questions_form_id         ON questions(form_id);
CREATE INDEX idx_questions_type            ON questions(type);
CREATE INDEX idx_questions_section_id      ON questions(section_id);
