ALTER TABLE uploaded_files
    ADD COLUMN question_id UUID REFERENCES questions(id),
    ADD COLUMN uploaded_by_ip VARCHAR(45);

CREATE INDEX idx_uploaded_files_question_id ON uploaded_files(question_id);

-- Tabela de configuração de upload por formulário
-- Permite definir regras globais de upload para cada form
CREATE TABLE form_upload_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id         UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    max_file_size   BIGINT NOT NULL DEFAULT 10485760,       -- 10MB padrão
    max_files_total INTEGER NOT NULL DEFAULT 20,             -- máximo de arquivos por resposta
    allowed_types   TEXT[] NOT NULL DEFAULT '{image/jpeg,image/png,application/pdf}',
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_form_upload_config UNIQUE (form_id)
);

CREATE INDEX idx_form_upload_configs_form_id ON form_upload_configs(form_id);

COMMENT ON COLUMN form_upload_configs.max_file_size IS 'Tamanho máximo por arquivo em bytes (padrão 10MB)';
COMMENT ON COLUMN form_upload_configs.allowed_types IS 'Array de MIME types permitidos';
COMMENT ON COLUMN form_upload_configs.max_files_total IS 'Máximo de arquivos por resposta completa';
