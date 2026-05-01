from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongo_uri: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7 days

    groq_api_key: str

    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_from: str = "whatsapp:+14155238886"
    twilio_sms_from: str = ""

    resend_api_key: str = ""

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/calendar/callback"

    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_claims_email: str = "mailto:admin@example.com"

    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()
