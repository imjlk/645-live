use crate::{auth, body, db, engagement, settings};
use serde::Deserialize;
use serde_json::{Value as Json, json};
use trailbase_guest_common::{responses::*, session::hmac_hex};
use trailbase_wasm::{db::Value, http::Request};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Order {
    order_id: String,
}

fn valid_id(id: &str) -> bool {
    id.len() == 36
        && id.bytes().enumerate().all(|(i, b)| match i {
            8 | 13 | 18 | 23 => b == b'-',
            _ => b.is_ascii_hexdigit() && !b.is_ascii_uppercase(),
        })
}

fn verified_refund(response: &Json, order: &str, sku: &str) -> ApiResult<bool> {
    let payload = &response["body"];
    let receipt = &payload["success"];
    if !response["status"]
        .as_i64()
        .is_some_and(|v| (200..300).contains(&v))
        || payload["resultType"] != "SUCCESS"
        || receipt["orderId"] != order
        || receipt["sku"] != sku
    {
        return Err(bad_request(
            "UNVERIFIED_ORDER",
            "구매 내역을 확인하지 못했어요.",
        ));
    }
    match receipt["status"].as_str() {
        Some("PURCHASED" | "PAYMENT_COMPLETED") => Ok(false),
        Some("REFUNDED") => Ok(true),
        _ => Err(bad_request(
            "ORDER_NOT_PAID",
            "완료된 결제를 확인하지 못했어요.",
        )),
    }
}

const RECORD: &str = "INSERT INTO ait_lotto_ad_free_orders(order_digest, refunded) VALUES (?1,?2)
    ON CONFLICT(order_digest) DO UPDATE SET refunded = max(refunded, excluded.refunded)
    RETURNING refunded";

// This API verifies the receipt, not its owner. The app only accepts receipts
// returned by the current store account. An order never sets a profile-wide flag.
pub(crate) async fn verify(req: &mut Request) -> ApiResult<Json> {
    let input: Order = body(req).await?;
    {
        let mut tx = db::tx()?;
        auth::user(req, &mut tx)?;
        db::tx_commit(&mut tx)?;
    }
    if !valid_id(&input.order_id) {
        return Err(bad_request("INVALID_ORDER", "주문 정보를 확인해 주세요."));
    }
    let sku = settings::string("AIT_AD_FREE_SKU")
        .ok_or_else(|| bad_request("PRODUCT_UNAVAILABLE", "상품을 준비 중이에요."))?;
    let response = engagement::proxy_post(
        "/internal/mtls/request",
        json!({
            "method":"POST","path":"/api-partner/v1/apps-in-toss/order/get-order-status",
            "body":{"orderId":input.order_id}
        }),
    )
    .await?;
    let refunded = verified_refund(&response, &input.order_id, &sku)?;
    let digest = hmac_hex(
        &settings::required("AIT_IDENTITY_HMAC_SECRET")?,
        &format!("iap/{sku}/{}", input.order_id),
    )?;
    let mut tx = db::tx()?;
    let rows = db::tx_query(
        &mut tx,
        RECORD,
        &[Value::Text(digest), Value::Integer(refunded.into())],
    )?;
    let active = db::integer(&rows[0][0], "refunded")? == 0;
    db::tx_commit(&mut tx)?;
    Ok(json!({"active":active}))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn verifies_miniapp_order_sku_and_payment() {
        let mut response = json!({"status":200,"body":{"resultType":"SUCCESS","success":{"orderId":"id","sku":"adfree","status":"PAYMENT_COMPLETED"}}});
        assert!(!verified_refund(&response, "id", "adfree").unwrap());
        assert!(verified_refund(&response, "other", "adfree").is_err());
        assert!(verified_refund(&response, "id", "other").is_err());
        for status in ["ORDER_IN_PROGRESS", "MINIAPP_MISMATCH", "FAILED", "UNKNOWN"] {
            response["body"]["success"]["status"] = json!(status);
            assert!(verified_refund(&response, "id", "adfree").is_err());
        }
        response["body"]["success"]["status"] = json!("REFUNDED");
        assert!(verified_refund(&response, "id", "adfree").unwrap());
        response["status"] = json!(503);
        assert!(verified_refund(&response, "id", "adfree").is_err());
    }

    #[test]
    fn repeated_grants_and_late_paid_responses_cannot_undo_a_refund() {
        let db = rusqlite::Connection::open_in_memory().unwrap();
        db.execute_batch(include_str!(
            "../../traildepot/migrations/U1794000400__iap_ad_free.sql"
        ))
        .unwrap();
        for (order, refund, expected) in [
            ("one", 0, 0),
            ("one", 0, 0),
            ("one", 1, 1),
            ("one", 0, 1),
            ("new", 0, 0),
        ] {
            let stored: i64 = db
                .query_row(RECORD, (order, refund), |row| row.get(0))
                .unwrap();
            assert_eq!(stored, expected);
        }
    }
}
