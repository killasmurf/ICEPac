"""CORS must expose Content-Disposition so browsers can read download names."""

from app.core.config import settings


def test_cors_exposes_content_disposition(client):
    origin = settings.ALLOWED_ORIGINS[0]
    resp = client.get("/health", headers={"Origin": origin})
    assert resp.headers["access-control-allow-origin"] == origin
    exposed = resp.headers["access-control-expose-headers"]
    assert "Content-Disposition" in [h.strip() for h in exposed.split(",")]
