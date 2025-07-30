PRAGMA foreign_keys = OFF;

CREATE TABLE "__alter_table_lotto_winning_stores" (
    'id' INTEGER PRIMARY KEY,
    'round' INTEGER NOT NULL,
    'store_name' TEXT NOT NULL,
    'address' TEXT NOT NULL,
    'win_type' TEXT NOT NULL CHECK(win_type IN ('1등', '2등')),
    'selection_type' TEXT CHECK(selection_type IN ('자동', '수동'))
) STRICT;

INSERT INTO
    "__alter_table_lotto_winning_stores" (
        id,
        round,
        store_name,
        address,
        win_type,
        selection_type
    )
SELECT
    id,
    round,
    store_name,
    address,
    win_type,
    selection_type
FROM
    "lotto_winning_stores";

DROP TABLE "lotto_winning_stores";

ALTER TABLE
    "__alter_table_lotto_winning_stores" RENAME TO "lotto_winning_stores";

PRAGMA foreign_keys = ON;