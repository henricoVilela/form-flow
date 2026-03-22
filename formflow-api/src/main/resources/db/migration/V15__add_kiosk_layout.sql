ALTER TABLE forms
DROP CONSTRAINT chk_forms_layout;

ALTER TABLE forms
ADD CONSTRAINT chk_forms_layout CHECK (layout IN ('MULTI_STEP', 'SINGLE_PAGE', 'KIOSK'));
