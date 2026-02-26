CREATE TABLE forms (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    layout          VARCHAR(20) NOT NULL DEFAULT 'multi_step',
    published_at    TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT chk_forms_status CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT chk_forms_layout CHECK (layout IN ('multi_step', 'single_page'))
);

CREATE INDEX idx_forms_user_id    ON forms(user_id);
CREATE INDEX idx_forms_status     ON forms(status);
CREATE INDEX idx_forms_created_at ON forms(created_at);
