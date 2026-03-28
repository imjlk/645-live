const NAVER_VERIFICATION_CONTENT =
	"naver-site-verification: naverbd1bcec1b8a0d0e3be76a4bd607f54ae.html";

export function GET() {
	return new Response(NAVER_VERIFICATION_CONTENT, {
		headers: {
			"content-type": "text/html; charset=utf-8",
			"cache-control": "public, max-age=300, stale-while-revalidate=86400",
		},
	});
}
