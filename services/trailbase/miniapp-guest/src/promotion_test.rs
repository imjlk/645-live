//! Operator-enabled console verification. These calls never use live promotion codes
//! or consume attendance eligibility, campaign budgets, or reward reservations.
use crate::{auth, body, db, engagement, settings};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use serde::Deserialize;
use serde_json::{Value as Json, json};
use trailbase_guest_common::{promotion_rewards as rewards, responses::*, session::hmac_hex};
use trailbase_wasm::{db::Value, http::Request};

const SOURCE: &str = "ait_lotto_promotion_test";
const MAX_WINDOW_MS: i64 = 7 * 86_400_000;

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "snake_case")]
enum Kind {
    Daily,
    Weekly,
}
impl Kind {
    fn code(self) -> Option<String> {
        let name = match self {
            Self::Daily => "AIT_PROMOTION_TEST_DAILY_CODE",
            Self::Weekly => "AIT_PROMOTION_TEST_WEEKLY_CODE",
        };
        settings::string(name).filter(|code| valid_test_code(code))
    }
    fn amount(self) -> i64 {
        match self {
            Self::Daily => 1,
            Self::Weekly => 50,
        }
    }
}

fn valid_test_code(code: &str) -> bool {
    code.strip_prefix("TEST_").is_some_and(|suffix| {
        suffix.len() == 26
            && suffix
                .bytes()
                .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit())
    })
}

fn allowed(user: &str, users: &str, now: i64, until: i64) -> bool {
    until > now
        && until.saturating_sub(now) <= MAX_WINDOW_MS
        && users.split(',').any(|candidate| candidate.trim() == user)
}

pub(crate) fn enabled_for(user: &[u8], now: i64) -> bool {
    let until = settings::string("AIT_PROMOTION_TEST_UNTIL")
        .and_then(|value| value.parse().ok())
        .unwrap_or(0);
    allowed(
        &URL_SAFE_NO_PAD.encode(user),
        &settings::string_or("AIT_PROMOTION_TEST_USER_IDS", ""),
        now,
        until,
    ) && Kind::Daily.code().is_some()
        && Kind::Weekly.code().is_some()
        && settings::string("MTLS_PROXY_URL").is_some()
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Input {
    kind: Kind,
}

pub(crate) async fn run(req: &mut Request) -> ApiResult<Json> {
    let input: Input = body(req).await?;
    let mut tx = db::tx()?;
    let user = auth::user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    if !enabled_for(&user.id, now) {
        return Err(not_found("TEST_UNAVAILABLE", "사용할 수 없는 테스트예요."));
    }
    let code = input
        .kind
        .code()
        .ok_or_else(|| internal("Invalid test promotion code"))?;
    let request_id = format!(
        "ait-promotion-test-{}",
        hmac_hex(
            &settings::required("AIT_IDENTITY_HMAC_SECRET")?,
            &format!("{}:{code}", URL_SAFE_NO_PAD.encode(&user.id)),
        )?
    );
    let ledger = rewards::insert_promotion_reward_ledger_tx(
        &mut tx,
        rewards::DEFAULT_PROMOTION_REWARD_LEDGER_TABLE,
        rewards::PromotionRewardLedgerInsert {
            id: None,
            user: &user.id,
            campaign_id: None,
            source_type: SOURCE,
            source_id: Some(&code),
            reward_amount: input.kind.amount(),
            provider: None,
            provider_request_id: &request_id,
            requested_at: now,
            now,
        },
    )?;
    let record = ledger.record;
    // Only legacy keyless rows have unknown execution history. A three-step
    // prepare failure can safely resume the same persisted intent.
    if record.status == "success"
        || record.status == "recorded"
        || (record.protocol.as_deref() != Some("three-step")
            && record.provider_transaction_key.is_none())
    {
        db::tx_commit(&mut tx)?;
        return Ok(json!({"testOnly":true,"status":record.status,"amount":input.kind.amount()}));
    }
    let recipient = db::tx_query(
        &mut tx,
        "SELECT anonymous_key_sealed FROM ait_lotto_profiles WHERE user_id=?1 AND disabled=0",
        &[Value::Blob(user.id)],
    )?;
    let anon_key = engagement::unseal(&db::text(&recipient[0][0], "recipient")?)?;
    db::tx_commit(&mut tx)?;
    engagement::execute_reward(&engagement::RewardAttempt::from(&record), &anon_key, &code).await?;
    let mut tx = db::tx()?;
    let rows = db::tx_query(
        &mut tx,
        "SELECT status FROM promotion_reward_ledger WHERE id=?1",
        &[Value::Text(record.id)],
    )?;
    let status = rows
        .first()
        .map(|r| db::text(&r[0], "status"))
        .transpose()?
        .unwrap_or_else(|| "removed".into());
    db::tx_commit(&mut tx)?;
    Ok(json!({"testOnly":true,"status":status,"amount":input.kind.amount()}))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn only_test_codes_and_explicit_unexpired_testers_are_allowed() {
        assert!(valid_test_code("TEST_00000000000000000000000001"));
        for code in [
            "00000000000000000000000001",
            "TEST_",
            "TEST_00000000000000000000000001\n",
        ] {
            assert!(!valid_test_code(code));
        }
        assert!(allowed("tester", "someone, tester", 100, 101));
        assert!(!allowed("tester", "someone", 100, 101));
        assert!(!allowed("tester", "tester", 100, 100));
        assert!(!allowed("tester", "tester", 100, 101 + MAX_WINDOW_MS));
    }
}
