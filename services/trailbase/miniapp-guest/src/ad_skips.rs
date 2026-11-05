use crate::{ads, attendance_rewards, auth, body, db, generation_ads};
use serde::Deserialize;
use serde_json::Value as Json;
use trailbase_guest_common::{
    ad_skip_tickets::{self as tickets, AdSkipEligibility, AdSkipRedeemRequest},
    responses::*,
};
use trailbase_wasm::{db::Transaction, http::Request};

/// Opportunity keys are opaque client prompt IDs (kit format). They never carry
/// identities or tokens.
pub(crate) fn valid_key(key: &str) -> bool {
    (1..=128).contains(&key.len())
        && key
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"._:-".contains(&b))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Redeem {
    request_id: String,
    placement: String,
    opportunity_key: String,
    #[serde(default)]
    context: String,
    // Older kit controllers sent their local persistence timestamp. Accept only
    // this known legacy field; receipt times and eligibility remain server-owned.
    #[serde(default, rename = "createdAt")]
    _client_created_at: Option<i64>,
}

// Read-only: decides whether the prompt still needs an ad. Errors when the feature
// itself cannot run, so nothing is charged.
fn evaluate(
    tx: &mut Transaction,
    user: &[u8],
    request: &AdSkipRedeemRequest<'_>,
    now: i64,
) -> ApiResult<AdSkipEligibility> {
    if ads::ad_in_progress(tx, user, request.placement, request.opportunity_key, now)? {
        return Err(conflict(
            "AD_IN_PROGRESS",
            "진행 중인 광고 결과를 확인하고 있어요. 잠시 후 다시 시도해 주세요.",
        ));
    }
    if request.placement == generation_ads::PLACEMENT {
        generation_ads::ticket_eligibility(tx, user, now)
    } else {
        ads::feature_ticket_eligibility(tx, user, request.placement, now)
    }
}

// Advances the consumer's own ad state. Custom/report cadence is device-owned, so
// only generation has server state that must actually move.
fn resolve(
    tx: &mut Transaction,
    user: &[u8],
    request: &AdSkipRedeemRequest<'_>,
    now: i64,
) -> ApiResult<bool> {
    if request.placement == generation_ads::PLACEMENT {
        generation_ads::resolve_with_ticket(tx, user, now)
    } else {
        Ok(true)
    }
}

/// Uses one ad skip ticket instead of one full-screen ad. It creates no ad session,
/// SDK event, impression or completion, and never counts toward ad caps or metrics.
pub(crate) async fn redeem(req: &mut Request) -> ApiResult<Json> {
    let input: Redeem = body(req).await?;
    let mut tx = db::tx()?;
    let user = auth::user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    let config = attendance_rewards::current();
    let request = AdSkipRedeemRequest {
        request_id: &input.request_id,
        placement: &input.placement,
        opportunity_key: &input.opportunity_key,
        context: &input.context,
    };
    let receipt = tickets::redeem_ad_skip_ticket_tx(
        &mut tx,
        &user.id,
        &request,
        now,
        config.allowed_placements(),
        |tx, request| evaluate(tx, &user.id, request, now),
        |tx, request| resolve(tx, &user.id, request, now),
    )?;
    db::tx_commit(&mut tx)?;
    serde_json::to_value(receipt).map_err(internal)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn redemption_accepts_legacy_metadata_without_relaxing_the_contract() {
        let payload = serde_json::json!({
            "requestId": "request-000000001",
            "placement": "generation_continue",
            "opportunityKey": "generation:1",
            "context": ""
        });
        assert!(serde_json::from_value::<Redeem>(payload.clone()).is_ok());
        let mut legacy = payload.clone();
        legacy["createdAt"] = serde_json::json!(1_793_857_200_000_i64);
        let parsed: Redeem = serde_json::from_value(legacy).unwrap();
        assert_eq!(parsed.request_id, "request-000000001");
        assert_eq!(parsed.opportunity_key, "generation:1");
        let mut unexpected = payload.clone();
        unexpected["balance"] = serde_json::json!(100);
        assert!(serde_json::from_value::<Redeem>(unexpected).is_err());
        let mut missing = payload;
        missing.as_object_mut().unwrap().remove("requestId");
        assert!(serde_json::from_value::<Redeem>(missing).is_err());
    }

    #[test]
    fn opportunity_keys_are_opaque_and_bounded() {
        assert!(valid_key("generation_continue:3f9a-01"));
        assert!(!valid_key(""));
        assert!(!valid_key("has space"));
        assert!(!valid_key(&"a".repeat(129)));
    }
}
