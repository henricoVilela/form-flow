ALTER TABLE forms
    ADD COLUMN thank_you_redirect_url  VARCHAR(2048),
    ADD COLUMN thank_you_redirect_delay INTEGER,
    ADD COLUMN thank_you_show_resubmit  BOOLEAN NOT NULL DEFAULT false;
