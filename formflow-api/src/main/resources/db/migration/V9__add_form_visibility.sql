ALTER TABLE forms
    ADD COLUMN visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
    ADD COLUMN slug VARCHAR(100),
    ADD COLUMN password_hash VARCHAR(255),
    ADD COLUMN max_responses INTEGER,
    ADD COLUMN expires_at TIMESTAMP,
    ADD COLUMN welcome_message TEXT,
    ADD COLUMN thank_you_message TEXT;

ALTER TABLE forms
    ADD CONSTRAINT chk_forms_visibility CHECK (visibility IN ('PUBLIC', 'PRIVATE', 'PASSWORD_PROTECTED'));

CREATE UNIQUE INDEX idx_forms_slug ON forms(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_forms_visibility ON forms(visibility);
CREATE INDEX idx_forms_expires_at ON forms(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON COLUMN forms.visibility IS 'public = qualquer um com link, private = somente autenticados, password_protected = requer senha';
COMMENT ON COLUMN forms.slug IS 'Slug amigável para URL pública (ex: /f/meu-formulario)';
COMMENT ON COLUMN forms.password_hash IS 'Hash BCrypt da senha quando visibility=password_protected';
COMMENT ON COLUMN forms.max_responses IS 'Limite máximo de respostas (null = ilimitado)';
COMMENT ON COLUMN forms.expires_at IS 'Data de expiração do formulário (null = sem expiração)';
COMMENT ON COLUMN forms.welcome_message IS 'Mensagem de boas-vindas exibida antes do formulário';
COMMENT ON COLUMN forms.thank_you_message IS 'Mensagem exibida após submissão';
