CREATE TABLE response_answers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id     UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    form_id         UUID NOT NULL REFERENCES forms(id),
    question_id     UUID NOT NULL REFERENCES questions(id),
    question_type   VARCHAR(50) NOT NULL,
    value_text      TEXT,
    value_number    NUMERIC,
    value_date      DATE,
    value_options   TEXT[],
    value_files     TEXT[],
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_response_answers_response_id  ON response_answers(response_id);
CREATE INDEX idx_response_answers_form_id      ON response_answers(form_id);
CREATE INDEX idx_response_answers_question_id  ON response_answers(question_id);
CREATE INDEX idx_response_answers_value_text   ON response_answers(value_text);
CREATE INDEX idx_response_answers_value_options ON response_answers USING GIN(value_options);
