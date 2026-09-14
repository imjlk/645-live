use crate::{db, engagement::kst_day};
use serde_json::{Value as Json, json};
use trailbase_guest_common::responses::*;
use trailbase_wasm::db::{Transaction, Value};

pub const DAYS: i64 = 7;
#[derive(Clone, Copy, Debug, PartialEq)]
struct Day {
    day: i64,
    restored: bool,
}
#[derive(Debug, PartialEq)]
struct Sequence {
    completed: Vec<(i64, i64)>,
    active: Vec<Day>,
}
// Days must be unique and ascending. Completed cycles never share an attendance day.
fn sequences(days: &[Day]) -> Sequence {
    let mut out = Sequence {
        completed: vec![],
        active: vec![],
    };
    for entry in days {
        if out
            .active
            .last()
            .is_some_and(|last| last.day + 1 != entry.day)
        {
            out.active.clear();
        }
        out.active.push(*entry);
        if out.active.len() == DAYS as usize {
            out.completed.push((out.active[0].day, entry.day));
            out.active.clear();
        }
    }
    out
}
fn days_after(tx: &mut Transaction, user: &[u8], after: i64, today: i64) -> ApiResult<Vec<Day>> {
    db::tx_query(tx,
        "SELECT day, min(restored) FROM (SELECT day,0 AS restored FROM ait_lotto_attendance WHERE user_id=?1 UNION ALL SELECT day,1 AS restored FROM ait_lotto_attendance_restores WHERE user_id=?1) WHERE day>?2 AND day<=?3 GROUP BY day ORDER BY day",
        &[Value::Blob(user.to_vec()),Value::Integer(after),Value::Integer(today)],
    )?.iter().map(|r| Ok(Day {day:db::integer(&r[0],"day")?,restored:db::integer(&r[1],"restored")?==1})).collect()
}
fn latest_end(tx: &mut Transaction, user: &[u8]) -> ApiResult<i64> {
    let rows = db::tx_query(
        tx,
        "SELECT coalesce(max(end_day),0) FROM ait_lotto_attendance_cycles WHERE user_id=?1",
        &[Value::Blob(user.to_vec())],
    )?;
    db::integer(&rows[0][0], "end")
}
pub fn sync_cycles(tx: &mut Transaction, user: &[u8], now: i64) -> ApiResult<()> {
    let last = latest_end(tx, user)?;
    let state = sequences(&days_after(tx, user, last, kst_day(now))?);
    for (start, end) in state.completed {
        db::tx_execute(
            tx,
            "INSERT OR IGNORE INTO ait_lotto_attendance_cycles(user_id,start_day,end_day,created_at) VALUES (?1,?2,?3,?4)",
            &[
                Value::Blob(user.to_vec()),
                Value::Integer(start),
                Value::Integer(end),
                Value::Integer(now),
            ],
        )?;
    }
    Ok(())
}
pub fn generated_today(tx: &mut Transaction, user: &[u8], today: i64) -> ApiResult<bool> {
    let start = today * 86_400_000 - 32_400_000;
    Ok(!db::tx_query(tx,
        "SELECT 1 FROM ait_lotto_generation_requests WHERE user_id=?1 AND created_at>=?2 AND created_at<?3 LIMIT 1",
        &[Value::Blob(user.to_vec()),Value::Integer(start),Value::Integer(start+86_400_000)])?.is_empty())
}
pub fn checked(tx: &mut Transaction, user: &[u8], today: i64) -> ApiResult<bool> {
    Ok(!db::tx_query(
        tx,
        "SELECT 1 FROM ait_lotto_attendance WHERE user_id=?1 AND day=?2",
        &[Value::Blob(user.to_vec()), Value::Integer(today)],
    )?
    .is_empty())
}
fn restorable(days: &[Day], today: i64) -> bool {
    if days.iter().any(|d| d.day == today - 1) {
        return false;
    }
    let previous: Vec<_> = days.iter().copied().filter(|d| d.day < today).collect();
    let state = sequences(&previous);
    state.active.last().is_some_and(|d| d.day == today - 2)
        && !state.active.iter().any(|d| d.restored)
}
pub fn can_restore(tx: &mut Transaction, user: &[u8], now: i64) -> ApiResult<bool> {
    let today = kst_day(now);
    let last = latest_end(tx, user)?;
    Ok(generated_today(tx, user, today)? && restorable(&days_after(tx, user, last, today)?, today))
}
pub fn require_restore(tx: &mut Transaction, user: &[u8], now: i64) -> ApiResult<()> {
    if !can_restore(tx, user, now)? {
        return Err(conflict(
            "RESTORE_UNAVAILABLE",
            "오늘 번호를 생성한 뒤 어제 놓친 출석을 복구할 수 있어요. 복구는 7일 주기에 한 번만 가능해요.",
        ));
    }
    Ok(())
}
pub fn restore(
    tx: &mut Transaction,
    user: &[u8],
    now: i64,
    session: &str,
    reserved_day: Option<i64>,
) -> ApiResult<()> {
    let today = kst_day(now);
    if reserved_day != Some(today) {
        return Err(conflict(
            "RESTORE_EXPIRED",
            "날짜가 바뀌었어요. 출석 현황을 다시 확인해 주세요.",
        ));
    }
    require_restore(tx, user, now)?;
    db::tx_execute(
        tx,
        "INSERT INTO ait_lotto_attendance_restores(user_id,day,ad_session_id,created_at) VALUES (?1,?2,?3,?4)",
        &[
            Value::Blob(user.to_vec()),
            Value::Integer(today - 1),
            Value::Text(session.into()),
            Value::Integer(now),
        ],
    )?;
    sync_cycles(tx, user, now)
}
pub fn status(tx: &mut Transaction, user: &[u8], now: i64) -> ApiResult<Json> {
    sync_cycles(tx, user, now)?;
    let today = kst_day(now);
    let last = latest_end(tx, user)?;
    let days = days_after(tx, user, last, today)?;
    let state = sequences(&days);
    let count = if last == today {
        DAYS
    } else if state.active.last().is_some_and(|d| d.day >= today - 1) {
        state.active.len() as i64
    } else {
        0
    };
    Ok(
        json!({"day":today,"checkedIn":checked(tx,user,today)?,"generatedToday":generated_today(tx,user,today)?,"streak":count,"cycleLength":DAYS,"canRestore":can_restore(tx,user,now)?,"restoreLimit":1,"serverTime":now}),
    )
}
pub fn weekly_period(tx: &mut Transaction, user: &[u8], today: i64) -> ApiResult<Option<i64>> {
    let rows = db::tx_query(
        tx,
        "SELECT end_day FROM ait_lotto_attendance_cycles WHERE user_id=?1 AND end_day>=?2 AND end_day<=?3 ORDER BY end_day DESC LIMIT 1",
        &[
            Value::Blob(user.to_vec()),
            Value::Integer(today - 6),
            Value::Integer(today),
        ],
    )?;
    rows.first().map(|r| db::integer(&r[0], "end")).transpose()
}
#[cfg(test)]
mod tests {
    use super::*;
    fn days(range: std::ops::RangeInclusive<i64>) -> Vec<Day> {
        range
            .map(|day| Day {
                day,
                restored: false,
            })
            .collect()
    }
    #[test]
    fn seven_days_reset_without_overlapping_rewards() {
        let state = sequences(&days(1..=15));
        assert_eq!(state.completed, vec![(1, 7), (8, 14)]);
        assert_eq!(state.active, days(15..=15));
    }
    #[test]
    fn missed_day_resets_and_only_yesterday_can_be_restored() {
        let mut entries = days(1..=5);
        entries.extend(days(7..=7));
        assert!(restorable(&entries, 7));
        assert!(!restorable(&entries, 8));
        assert_eq!(sequences(&entries).active, days(7..=7));
    }
    #[test]
    fn restore_cannot_be_repeated_within_same_cycle() {
        let mut entries = days(1..=4);
        entries[1].restored = true;
        entries.extend(days(6..=6));
        assert!(!restorable(&entries, 6));
        assert!(!restorable(&days(1..=7), 9));
    }
    #[test]
    fn restore_on_day_eight_completes_previous_cycle() {
        let mut entries = days(1..=8);
        entries[6].restored = true;
        let state = sequences(&entries);
        assert_eq!(state.completed, vec![(1, 7)]);
        assert_eq!(state.active, days(8..=8));
    }
}
