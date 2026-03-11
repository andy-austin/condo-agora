import asyncio
import os

import httpx
import resend

CHASQUI_API_URL = os.getenv("CHASQUI_API_URL", "").strip()
CHASQUI_API_TOKEN = os.getenv("CHASQUI_API_TOKEN", "").strip()
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()
RESEND_FROM_EMAIL = os.getenv(
    "RESEND_FROM_EMAIL", "Condo Agora <noreply@condoagora.site>"
)

resend.api_key = RESEND_API_KEY


async def send_whatsapp_otp(to: str, code: str) -> None:
    """Send OTP code via WhatsApp using Chasqui text API."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{CHASQUI_API_URL}/messages/send/text",
            json={
                "to": to,
                "body": f"Tu código de verificación de Condo Agora es: {code}. Expira en 5 minutos.",
            },
            headers={"Authorization": f"Bearer {CHASQUI_API_TOKEN}"},
            timeout=10.0,
        )
        response.raise_for_status()


async def send_email_otp(to: str, code: str) -> None:
    """Send OTP code via email using Resend. Resend SDK is sync, so wrap in thread."""
    params = {
        "from": RESEND_FROM_EMAIL,
        "to": [to],
        "subject": "Tu código de verificación - Condo Agora",
        "html": f"""
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
            <h2>Código de verificación</h2>
            <p>Tu código es:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px;
                        padding: 16px; background: #f3f4f6; border-radius: 8px;
                        text-align: center;">{code}</div>
            <p style="color: #666; font-size: 14px; margin-top: 16px;">
                Este código expira en 5 minutos.
            </p>
        </div>
        """,
    }
    await asyncio.to_thread(resend.Emails.send, params)


async def send_whatsapp_invitation(to: str, org_name: str, invite_url: str) -> None:
    """Send invitation via WhatsApp using Chasqui template API."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{CHASQUI_API_URL}/messages/send/template",
            json={
                "to": to,
                "template_name": "org_invitation",
                "language_code": "es",
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": org_name},
                            {"type": "text", "text": invite_url},
                        ],
                    }
                ],
            },
            headers={"Authorization": f"Bearer {CHASQUI_API_TOKEN}"},
            timeout=10.0,
        )
        response.raise_for_status()


async def send_email_invitation(to: str, org_name: str, invite_url: str) -> None:
    """Send invitation via email using Resend."""
    params = {
        "from": RESEND_FROM_EMAIL,
        "to": [to],
        "subject": f"Invitación a {org_name} - Condo Agora",
        "html": f"""
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
            <h2>Te han invitado a {org_name}</h2>
            <p>Has sido invitado a unirte a <strong>{org_name}</strong> en Condo Agora.</p>
            <a href="{invite_url}"
               style="display: inline-block; padding: 12px 24px; background: #7c3aed;
                      color: white; text-decoration: none; border-radius: 8px;
                      margin-top: 16px;">
                Aceptar invitación
            </a>
            <p style="color: #666; font-size: 14px; margin-top: 16px;">
                Esta invitación expira en 7 días.
            </p>
        </div>
        """,
    }
    await asyncio.to_thread(resend.Emails.send, params)
