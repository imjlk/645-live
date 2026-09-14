#![forbid(unsafe_code)]

mod ads;
mod attendance;
mod auth;
mod dev;
mod engagement;
mod lotto;
mod maintenance;

use serde_json::Value as Json;
use trailbase_guest_common::{db, responses::*, settings};
use trailbase_wasm::http::{Request, Response, StatusCode, routing};
use trailbase_wasm::job::Job;
use trailbase_wasm::{Guest, export};

fn respond(result: ApiResult<Json>) -> Response {
    match result {
        Ok(value) => {
            let mut response = ok(value);
            response
                .headers_mut()
                .insert("cache-control", "no-store".parse().unwrap());
            response
        }
        Err(mut err) => {
            if err.status.is_server_error() && err.code != "MINIAPP_UNAVAILABLE" {
                eprintln!("miniapp {}: {}", err.code, err.message);
                err.message = "잠시 연결이 원활하지 않아요. 다시 시도해 주세요.".into();
            }
            error(err)
        }
    }
}

pub(crate) fn enabled() -> ApiResult<()> {
    if settings::string_or("AIT_ENABLED", "false") != "true" {
        return Err(ApiError::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "MINIAPP_UNAVAILABLE",
            "미니앱을 준비 중이에요.",
        ));
    }
    Ok(())
}

pub(crate) async fn body<T: serde::de::DeserializeOwned>(req: &mut Request) -> ApiResult<T> {
    req.body()
        .json()
        .await
        .map_err(|_| bad_request("INVALID_BODY", "요청 내용을 확인해 주세요."))
}

macro_rules! endpoint {
    ($name:ident, $handler:path) => {
        async fn $name(mut req: Request) -> Response {
            respond($handler(&mut req).await)
        }
    };
}
endpoint!(bootstrap, auth::bootstrap);
endpoint!(session, auth::session);
endpoint!(withdraw, auth::withdraw);
endpoint!(round_context, lotto::round_context);
endpoint!(feed, lotto::feed);
endpoint!(combination_report, lotto::report);
endpoint!(generate, lotto::generate);
endpoint!(delete_generation, lotto::delete_generation);
endpoint!(heartbeat, auth::heartbeat);
endpoint!(disconnect, auth::disconnect);
endpoint!(ad_config, ads::config);
endpoint!(ad_start, ads::start);
endpoint!(ad_complete, ads::complete);
endpoint!(dev_entitlements, dev::entitlements);
endpoint!(attendance_status, engagement::attendance_status);
endpoint!(check_in, engagement::check_in);
endpoint!(agreement, engagement::agreement);
endpoint!(watch_result, engagement::watch_result);
endpoint!(claim_promotion, engagement::claim_promotion);

struct Miniapp;
impl Guest for Miniapp {
    fn http_handlers() -> Vec<trailbase_wasm::http::HttpRoute> {
        vec![
            routing::post("/api/app/v1/session/bootstrap", bootstrap),
            routing::get("/api/app/v1/session/me", session),
            routing::post("/api/app/v1/session/me", session),
            routing::post("/api/app/v1/session/withdraw", withdraw),
            routing::post("/api/app/v1/presence/heartbeat", heartbeat),
            routing::post("/api/app/v1/presence/disconnect", disconnect),
            // Public website reads stay available while miniapp participation is disabled.
            routing::get("/api/app/v1/lotto/round-context", round_context),
            routing::get("/api/app/v1/lotto/feed", feed),
            routing::post("/api/app/v1/lotto/report", combination_report),
            routing::post("/api/app/v1/lotto/generations", generate),
            routing::post("/api/app/v1/lotto/generations/delete", delete_generation),
            routing::get("/api/app/v1/ads/config", ad_config),
            routing::post("/api/app/v1/ads/start", ad_start),
            routing::post("/api/app/v1/ads/complete", ad_complete),
            routing::post("/api/app/v1/dev/entitlements", dev_entitlements),
            routing::get("/api/app/v1/attendance/status", attendance_status),
            routing::post("/api/app/v1/attendance/check-in", check_in),
            routing::post("/api/app/v1/attendance/promotion/claim", claim_promotion),
            routing::post("/api/app/v1/notifications/agreement", agreement),
            routing::post("/api/app/v1/notifications/watch-result", watch_result),
        ]
    }
    fn job_handlers() -> Vec<Job> {
        vec![
            Job::new(
                "ait_lotto_promotion_status",
                "41 * * * * *",
                Some(30000),
                maintenance::promotion_job,
            )
            .expect("valid cron"),
            Job::new(
                "ait_lotto_presence_bot",
                "*/15 * * * * *",
                Some(30000),
                maintenance::activity_job,
            )
            .expect("valid cron"),
            Job::new(
                "ait_lotto_result_notifications",
                "19 * * * * *",
                Some(30000),
                maintenance::notification_job,
            )
            .expect("valid cron"),
            Job::new(
                "ait_lotto_retention",
                "7 25 19 * * *",
                Some(30000),
                maintenance::retention_job,
            )
            .expect("valid cron"),
        ]
    }
}
export!(Miniapp);
