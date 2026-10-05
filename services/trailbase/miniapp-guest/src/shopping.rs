use crate::db;
use serde_json::{Value as Json, json};
use trailbase_guest_common::responses::ApiResult;
use trailbase_wasm::{db::Value, http::Request};
use url::Url;

// No Record API registration: operators write these two private configuration tables.
const CATALOG_SQL: &str = "SELECT placement,product_id,title,affiliate_url,image_url,expires_at
    FROM ait_lotto_shopping_recommendations
    WHERE enabled=1 AND starts_at<=?1 AND expires_at>?1
      AND EXISTS(SELECT 1 FROM ait_lotto_shopping_policy WHERE id=1 AND enabled=1)
    ORDER BY placement LIMIT 2";

fn https_url(raw: &str) -> Option<Url> {
    if raw.len() > 2048 || raw.chars().any(|c| c.is_whitespace() || c.is_control()) {
        return None;
    }
    let url = Url::parse(raw).ok()?;
    (url.scheme() == "https"
        && url.username().is_empty()
        && url.password().is_none()
        && url.port().is_none()
        && url.host_str().is_some())
    .then_some(url)
}

fn affiliate_url(raw: &str) -> bool {
    https_url(raw).is_some_and(|url| match url.host_str() {
        Some("toss.im") => url.path().starts_with("/_m/") && url.path().len() > 4,
        Some("service.toss.im") => {
            url.path() == "/shopping/s/"
                && url
                    .query_pairs()
                    .any(|(key, value)| key == "k" && !value.is_empty())
        }
        Some("toss.shopping") => {
            url.path().starts_with("/t/")
                && url.path().len() > 3
                && url
                    .query_pairs()
                    .any(|(key, value)| key == "k" && !value.is_empty())
        }
        _ => false,
    })
}

fn recommendation(row: &[Value], now: i64) -> ApiResult<Option<Json>> {
    let id = db::text(&row[1], "product id")?;
    let title = db::text(&row[2], "title")?;
    let link = db::text(&row[3], "affiliate url")?;
    if !id
        .bytes()
        .all(|c| c.is_ascii_alphanumeric() || c == b'_' || c == b'-')
        || !affiliate_url(&link)
        || title.trim().is_empty()
    {
        return Ok(None);
    }
    let image = match &row[4] {
        Value::Text(value) if https_url(value).is_some() => Some(value.as_str()),
        _ => None,
    };
    Ok(Some(json!({
        "placement":db::text(&row[0],"placement")?, "productId":id,"title":title,
        "affiliateUrl":link,"imageUrl":image,
        // A disabled/changed configuration cannot persist indefinitely on a device.
        "expiresAt":db::integer(&row[5],"expiry")?.min(now + 60_000)
    })))
}

pub(crate) async fn get(_req: &mut Request) -> ApiResult<Json> {
    let mut tx = db::tx()?;
    let now = db::now_ms_tx(&mut tx)?;
    let rows = db::tx_query(&mut tx, CATALOG_SQL, &[Value::Integer(now)])?;
    let offers = rows
        .iter()
        .map(|r| recommendation(r, now))
        .collect::<ApiResult<Vec<_>>>()?
        .into_iter()
        .flatten()
        .collect::<Vec<_>>();
    db::tx_commit(&mut tx)?;
    Ok(json!({"serverTime":now,"recommendations":offers}))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn only_issued_https_sharelinks_are_accepted() {
        assert!(affiliate_url("https://toss.im/_m/abcDEF"));
        assert!(affiliate_url(
            "https://service.toss.im/shopping/s/?k=issued&referrer=sharelink"
        ));
        assert!(affiliate_url(
            "https://toss.shopping/t/9876?k=issued&referrer=affiliate"
        ));
        for raw in [
            "http://toss.im/_m/x",
            "https://toss.im.evil.test/_m/x",
            "https://user@toss.im/_m/x",
            "https://toss.im/product/1",
            "https://service.toss.im/shopping/s/",
            "https://toss.im/_m/",
            "https://toss.im:8080/_m/x",
        ] {
            assert!(!affiliate_url(raw), "{raw}");
        }
    }
    #[test]
    fn catalog_defaults_off_and_excludes_disabled_future_and_expired_rows() {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        conn.execute_batch(include_str!(
            "../../traildepot/migrations/U1791172800__miniapp_shopping_recommendations.sql"
        ))
        .unwrap();
        conn.execute("INSERT INTO ait_lotto_shopping_recommendations VALUES('generator','example','Example','https://toss.im/_m/example',NULL,100,1000,1,100)",[]).unwrap();
        let count = |at| {
            conn.prepare(CATALOG_SQL)
                .unwrap()
                .query_map([at], |_| Ok(()))
                .unwrap()
                .count()
        };
        assert_eq!(count(200), 0);
        conn.execute("UPDATE ait_lotto_shopping_policy SET enabled=1", [])
            .unwrap();
        assert_eq!(count(99), 0);
        assert_eq!(count(100), 1);
        assert_eq!(count(1000), 0);
        conn.execute(
            "UPDATE ait_lotto_shopping_recommendations SET enabled=0",
            [],
        )
        .unwrap();
        assert_eq!(count(200), 0);
    }
    #[test]
    fn projection_has_no_price_identity_or_unbounded_expiry() {
        let row = vec![
            Value::Text("generator".into()),
            Value::Text("example".into()),
            Value::Text("Example".into()),
            Value::Text("https://toss.im/_m/example".into()),
            Value::Null,
            Value::Integer(1_000_000),
        ];
        let offer = recommendation(&row, 100).unwrap().unwrap();
        assert_eq!(offer["expiresAt"], 60_100);
        assert_eq!(offer.as_object().unwrap().len(), 6);
        let mut bad = row;
        bad[1] = Value::Text("identity with spaces".into());
        assert!(recommendation(&bad, 100).unwrap().is_none());
    }
}
