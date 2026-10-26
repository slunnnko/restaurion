-- ==============================================================================
-- RESTAURION: Migrace 0004 – Hodnocení držená přímo na lidech (zachovaná i po smazání zakázky)
-- a jednorázová reakce hodnoceného (1/1 bez diskuzního vlákna)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS job_reviews_new (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    job_title TEXT NOT NULL DEFAULT 'Realizovaná zakázka',
    reviewer_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    reviewer_name TEXT NOT NULL,
    reviewer_role TEXT,
    reviewee_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    reviewee_name TEXT NOT NULL,
    reviewee_role TEXT,
    rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    reply_author_id TEXT,
    reply_author_name TEXT,
    reply_text TEXT,
    reply_created_at TEXT
);

INSERT OR IGNORE INTO job_reviews_new (
    id, job_id, job_title, reviewer_id, reviewer_name, reviewee_id, reviewee_name, rating, review_text, created_at
)
SELECT
    r.id,
    r.job_id,
    COALESCE(j.title, 'Realizovaná zakázka'),
    r.reviewer_id,
    r.reviewer_name,
    r.reviewee_id,
    r.reviewee_name,
    r.rating,
    r.review_text,
    r.created_at
FROM job_reviews r
LEFT JOIN jobs j ON j.id = r.job_id;

DROP TABLE IF EXISTS job_reviews;
ALTER TABLE job_reviews_new RENAME TO job_reviews;

CREATE INDEX IF NOT EXISTS idx_job_reviews_job ON job_reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_job_reviews_reviewee ON job_reviews(reviewee_id);

