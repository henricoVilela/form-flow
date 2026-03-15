ALTER TABLE questions
DROP CONSTRAINT chk_questions_document_type;

ALTER TABLE questions
ADD CONSTRAINT chk_questions_document_type CHECK (
    document_type IS NULL OR document_type IN ('cpf', 'cnpj', 'none')
);