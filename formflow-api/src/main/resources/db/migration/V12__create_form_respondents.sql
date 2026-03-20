CREATE TABLE form_respondents (
    id           UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id      UUID         NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    token        VARCHAR(64)  NOT NULL,
    max_responses INTEGER,
    response_count INTEGER     NOT NULL DEFAULT 0,
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_form_respondents_token ON form_respondents(token);
CREATE INDEX idx_form_respondents_form_id ON form_respondents(form_id);

ALTER TABLE responses
    ADD COLUMN respondent_id UUID REFERENCES form_respondents(id) ON DELETE SET NULL;

CREATE INDEX idx_responses_respondent_id ON responses(respondent_id) WHERE respondent_id IS NOT NULL;

COMMENT ON TABLE form_respondents IS 'Respondentes nomeados com token de acesso único por formulário';
COMMENT ON COLUMN form_respondents.token IS 'Token único usado na URL: /f/{slug}?t={token}';
COMMENT ON COLUMN form_respondents.max_responses IS 'Limite de submissões por este respondente (null = ilimitado)';
COMMENT ON COLUMN form_respondents.response_count IS 'Contador de submissões realizadas por este respondente';
COMMENT ON COLUMN responses.respondent_id IS 'Respondente vinculado (null = acesso público/senha)';
