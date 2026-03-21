ALTER TABLE questions
DROP CONSTRAINT chk_questions_type;

ALTER TABLE questions
ADD CONSTRAINT chk_questions_type CHECK (type IN (
    'short_text', 'long_text', 'email', 'phone', 'url',
    'number', 'single_choice', 'multi_choice', 'dropdown',
    'date', 'file_upload', 'statement', 'scale', 'rating', 'matrix'
));
