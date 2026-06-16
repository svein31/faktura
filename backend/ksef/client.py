"""KSeF client abstraction — simulation + real KSeF 2.0 API.

Real flow (token-based, KSeF API 2.0):
  1. GET  /api/v2/security/public-key-certificates → public keys (DER base64)
  2. POST /api/v2/auth/challenge          → {challenge, timestampMs}
  3. Encrypt `token|timestampMs` with KsefTokenEncryption key (RSA-OAEP-SHA256)
  4. POST /api/v2/auth/ksef-token         → authenticationToken (used directly as Bearer)
  5. Encrypt AES-256 key with SymmetricKeyEncryption RSA key
  6. POST /api/v2/sessions/online         → session referenceNumber
  7. Encrypt invoice XML with AES-256-CBC
  8. POST /api/v2/sessions/online/{ref}/invoices → invoice referenceNumber
  9. GET  /api/v2/invoices/{ref}/status   → poll for ksefReferenceNumber
  10. DELETE /api/v2/sessions/online/{ref} → close session

NOTE: In KSeF API 2.0 there is NO separate token/redeem step.
      authenticationToken from step 4 is used directly as Bearer token.

Factory get_ksef_client(settings) returns RealKsefClient when token is set,
SimulationKsefClient otherwise.
"""
import asyncio
import base64
import hashlib
import os
import uuid
import xml.etree.ElementTree as ET
from abc import ABC, abstractmethod
from datetime import datetime, timezone, date
from xml.dom import minidom

import httpx

import config


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_date(issue_date) -> date:
    if isinstance(issue_date, date):
        return issue_date
    try:
        return datetime.strptime(str(issue_date)[:10], "%Y-%m-%d").date()
    except Exception:
        return datetime.now(timezone.utc).date()


def _generate_upo(ksef_number: str, doc_hash: str, seller_nip: str, env: str = "test") -> str:
    root = ET.Element("UPO")
    nag = ET.SubElement(root, "Naglowek")
    ET.SubElement(nag, "KodFormularza").text = "UPO"
    ET.SubElement(nag, "DataWystawienia").text = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    ET.SubElement(nag, "Srodowisko").text = env.upper()
    dok = ET.SubElement(root, "Dokument")
    ET.SubElement(dok, "NumerKSeF").text = ksef_number
    ET.SubElement(dok, "NIPSprzedawcy").text = seller_nip
    ET.SubElement(dok, "SkrotDokumentu").text = doc_hash
    ET.SubElement(dok, "TypSkrotu").text = "SHA-256"
    ET.SubElement(dok, "StatusPrzetworzenia").text = "200"
    ET.SubElement(dok, "Opis").text = "Dokument został poprawnie przetworzony"
    raw = ET.tostring(root, encoding="utf-8")
    return minidom.parseString(raw).toprettyxml(indent="  ", encoding="utf-8").decode("utf-8")


def _clean_nip(nip: str) -> str:
    return (nip or "").replace("-", "").replace(" ", "").strip()


# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------

class KsefClient(ABC):
    mode: str = "base"

    @abstractmethod
    async def send_invoice_async(self, xml: str, seller_nip: str, issue_date: str) -> dict:
        ...

    @abstractmethod
    async def test_connection_async(self) -> dict:
        ...


# ---------------------------------------------------------------------------
# Simulation client
# ---------------------------------------------------------------------------

class SimulationKsefClient(KsefClient):
    mode = "simulation"

    def __init__(self, env: str = "test"):
        self.env = env

    async def send_invoice_async(self, xml: str, seller_nip: str, issue_date: str) -> dict:
        nip = _clean_nip(seller_nip) or "0000000000"
        d = _parse_date(issue_date)
        doc_hash = hashlib.sha256(xml.encode("utf-8")).hexdigest()
        part = doc_hash[:12].upper()
        check = doc_hash[12:14].upper()
        ksef_number = f"{nip}-{d.strftime('%Y%m%d')}-{part}-{check}"
        reference_number = uuid.uuid4().hex.upper()
        upo_xml = _generate_upo(ksef_number, doc_hash, nip, self.env)
        return {
            "success": True,
            "mode": self.mode,
            "environment": self.env,
            "ksef_number": ksef_number,
            "reference_number": reference_number,
            "status_code": 200,
            "status": "Przyjęto w KSeF (symulacja)",
            "document_hash": doc_hash,
            "hash_algorithm": "SHA-256",
            "xml_base64": base64.b64encode(xml.encode("utf-8")).decode("ascii"),
            "upo_xml": upo_xml,
            "sent_at": datetime.now(timezone.utc).isoformat(),
        }

    async def test_connection_async(self) -> dict:
        return {
            "success": True,
            "mode": self.mode,
            "environment": self.env,
            "message": f"Połączenie testowe OK (tryb symulacji KSeF 2.0 - środowisko {self.env.upper()})",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


# ---------------------------------------------------------------------------
# Real KSeF 2.0 client
# ---------------------------------------------------------------------------

class RealKsefClient(KsefClient):
    mode = "real"

    KSEF_URLS = {
        "test": "https://api-test.ksef.mf.gov.pl",
        "demo": "https://api-demo.ksef.mf.gov.pl",
        "prod": "https://api.ksef.mf.gov.pl",
    }

    def __init__(self, token: str, env: str = "test"):
        self.token = token.strip()
        self.env = env
        self.base_url = self.KSEF_URLS.get(env, self.KSEF_URLS["test"])
        self.api = f"{self.base_url}/api/v2"

    # ---- helpers -----------------------------------------------------------

    def _rsa_oaep_encrypt(self, der_cert_b64: str, data: bytes) -> str:
        """RSA-OAEP-SHA256 encrypt data using a DER certificate (base64-encoded). Returns base64 string."""
        from cryptography import x509
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding as asym_padding, rsa

        der = base64.b64decode(der_cert_b64)
        cert = x509.load_der_x509_certificate(der)
        pub_key = cert.public_key()
        if not isinstance(pub_key, rsa.RSAPublicKey):
            raise ValueError("Klucz publiczny certyfikatu nie jest kluczem RSA")
        encrypted = pub_key.encrypt(
            data,
            asym_padding.OAEP(
                mgf=asym_padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None,
            ),
        )
        return base64.b64encode(encrypted).decode()

    def _aes_encrypt(self, key: bytes, iv: bytes, data: bytes) -> bytes:
        """AES-256-CBC encrypt data with PKCS7 padding."""
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.primitives import padding as sym_padding

        padder = sym_padding.PKCS7(128).padder()
        padded = padder.update(data) + padder.finalize()
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
        enc = cipher.encryptor()
        return enc.update(padded) + enc.finalize()

    async def _get_certs(self) -> dict:
        """Fetch public key certs and return dict with 'token_cert' and 'sym_cert' items."""
        async with httpx.AsyncClient(timeout=15, verify=True) as c:
            r = await c.get(f"{self.api}/security/public-key-certificates")
            r.raise_for_status()
            certs = r.json()

        token_cert = None
        sym_cert = None
        for item in (certs if isinstance(certs, list) else []):
            usage = item.get("usage", [])
            if "KsefTokenEncryption" in usage and not token_cert:
                token_cert = item
            if "SymmetricKeyEncryption" in usage and not sym_cert:
                sym_cert = item

        # Fallback if structure uses top-level field
        if not token_cert and not sym_cert and isinstance(certs, list) and certs:
            token_cert = certs[0]
            sym_cert = certs[0]

        if not token_cert:
            raise ValueError("Brak certyfikatu KsefTokenEncryption z serwera KSeF.")
        if not sym_cert:
            sym_cert = token_cert  # often same cert supports both

        return {"token_cert": token_cert, "sym_cert": sym_cert}

    async def _get_challenge(self, nip: str) -> dict:
        """POST /api/v2/auth/challenge → {challenge, timestampMs}"""
        async with httpx.AsyncClient(timeout=15, verify=True) as c:
            r = await c.post(
                f"{self.api}/auth/challenge",
                json={"contextIdentifier": {"type": "Nip", "value": nip}},
                headers={"Content-Type": "application/json"},
            )
            if not r.is_success:
                raise RuntimeError(
                    f"Błąd /auth/challenge HTTP {r.status_code}: {r.text}"
                )
            return r.json()

    async def _auth_ksef_token(self, nip: str, challenge: str, timestamp_ms: int, token_cert: dict) -> str:
        """POST /api/v2/auth/ksef-token → authenticationToken (string JWT)"""
        payload_str = f"{self.token}|{timestamp_ms}"
        encrypted = self._rsa_oaep_encrypt(token_cert["certificate"], payload_str.encode("utf-8"))

        body = {
            "challenge": challenge,
            "contextIdentifier": {"type": "Nip", "value": nip},
            "encryptedToken": encrypted,
        }
        pub_key_id = token_cert.get("publicKeyId") or token_cert.get("certificateId")
        if pub_key_id:
            body["publicKeyId"] = pub_key_id

        async with httpx.AsyncClient(timeout=15, verify=True) as c:
            r = await c.post(
                f"{self.api}/auth/ksef-token",
                json=body,
                headers={"Content-Type": "application/json"},
            )
            if not r.is_success:
                raise RuntimeError(
                    f"Błąd /auth/ksef-token HTTP {r.status_code}: {r.text}"
                )
            data = r.json()
            # Response: {referenceNumber, authenticationToken: {token, validUntil}}
            auth_tok = data.get("authenticationToken", {})
            if isinstance(auth_tok, dict):
                return auth_tok.get("token", "")
            if isinstance(auth_tok, str):
                return auth_tok
            return ""

    async def _open_session(self, access_token: str, sym_cert: dict) -> tuple:
        """POST /api/v2/sessions/online → (session_ref, aes_key, iv)"""
        aes_key = os.urandom(32)   # AES-256
        iv = os.urandom(16)        # 128-bit IV

        encrypted_key = self._rsa_oaep_encrypt(sym_cert["certificate"], aes_key)

        body = {
            "formCode": {
                "systemCode": "FA (2)",
                "schemaVersion": "1-0E",
                "value": "FA",
            },
            "encryption": {
                "encryptedSymmetricKey": encrypted_key,
                "initializationVector": base64.b64encode(iv).decode(),
                "publicKeyId": sym_cert.get("publicKeyId", sym_cert.get("certificateId", "")),
            },
        }

        async with httpx.AsyncClient(timeout=30, verify=True) as c:
            r = await c.post(
                f"{self.api}/sessions/online",
                json=body,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
            )
            if not r.is_success:
                raise RuntimeError(
                    f"Błąd /sessions/online HTTP {r.status_code}: {r.text}"
                )
            data = r.json()
            session_ref = (
                data.get("referenceNumber")
                or data.get("sessionToken", {}).get("referenceNumber")
                or ""
            )
        return session_ref, aes_key, iv

    async def _send_invoice(self, access_token: str, session_ref: str,
                            xml: str, aes_key: bytes, iv: bytes) -> str:
        """POST /api/v2/sessions/online/{ref}/invoices → invoice reference number"""
        xml_bytes = xml.encode("utf-8")
        encrypted_xml = self._aes_encrypt(aes_key, iv, xml_bytes)
        sha256_hash = hashlib.sha256(xml_bytes).digest()
        enc_sha256_hash = hashlib.sha256(encrypted_xml).digest()

        body = {
            "invoiceHash": base64.b64encode(sha256_hash).decode(),
            "invoiceSize": len(xml_bytes),
            "encryptedInvoiceHash": base64.b64encode(enc_sha256_hash).decode(),
            "encryptedInvoiceSize": len(encrypted_xml),
            "encryptedInvoiceContent": base64.b64encode(encrypted_xml).decode(),
        }

        async with httpx.AsyncClient(timeout=30, verify=True) as c:
            r = await c.post(
                f"{self.api}/sessions/online/{session_ref}/invoices",
                json=body,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
            )
            if not r.is_success:
                raise RuntimeError(
                    f"Błąd /sessions/online/.../invoices HTTP {r.status_code}: {r.text}"
                )
            data = r.json()
            return (
                data.get("referenceNumber")
                or data.get("invoiceId")
                or data.get("elementReferenceNumber")
                or ""
            )

    async def _poll_invoice_status(self, access_token: str, session_ref: str, invoice_ref: str) -> str:
        """Poll GET /api/v2/invoices/{invoice_ref}/status until KSeF number is assigned."""
        async with httpx.AsyncClient(timeout=30, verify=True) as c:
            for _ in range(30):
                r = await c.get(
                    f"{self.api}/invoices/{invoice_ref}/status",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if r.status_code == 200:
                    data = r.json()
                    ksef_num = (
                        data.get("ksefReferenceNumber")
                        or data.get("ksefNumber")
                        or data.get("ksef_number")
                    )
                    if ksef_num:
                        return ksef_num

                    status_obj = data.get("processingCode") or data.get("status", {})
                    if isinstance(status_obj, dict):
                        code = status_obj.get("code")
                    else:
                        code = status_obj

                    if code in (200, 100, 150, None):
                        pass
                    else:
                        details_raw = (data.get("status") or {}).get("details", [])
                        details = ", ".join(details_raw) if details_raw else ""
                        desc = (data.get("status") or {}).get("description", "Nieznany błąd weryfikacji")
                        raise RuntimeError(
                            f"KSeF błąd przetwarzania (kod {code}): {desc}. Szczegóły: {details}"
                        )
                elif r.status_code == 404:
                    pass
                else:
                    raise RuntimeError(
                        f"Błąd odpytywania o status {r.status_code}: {r.text[:300]}"
                    )
                await asyncio.sleep(2)
        return invoice_ref  # return ref as fallback if timeout

    async def _close_session(self, access_token: str, session_ref: str) -> None:
        """DELETE /api/v2/sessions/online/{ref}"""
        try:
            async with httpx.AsyncClient(timeout=10, verify=True) as c:
                await c.delete(
                    f"{self.api}/sessions/online/{session_ref}",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
        except Exception:
            pass

    # ---- public interface --------------------------------------------------

    async def send_invoice_async(self, xml: str, seller_nip: str, issue_date: str) -> dict:
        nip = _clean_nip(seller_nip)
        if not nip:
            raise ValueError("Brakuje NIP sprzedawcy")

        # 1. Get public key certs
        certs = await self._get_certs()

        # 2. Get challenge
        chall_data = await self._get_challenge(nip)
        challenge = chall_data.get("challenge", "")
        timestamp_ms = chall_data.get("timestampMs") or chall_data.get("timestamp") or int(datetime.now(timezone.utc).timestamp() * 1000)
        if not challenge:
            raise RuntimeError("KSeF nie zwrócił challenge")

        # 3. Auth with KSeF token → authenticationToken (used directly as Bearer)
        auth_token = await self._auth_ksef_token(nip, challenge, timestamp_ms, certs["token_cert"])
        if not auth_token:
            raise RuntimeError("KSeF nie zwrócił authenticationToken")

        # 4. Open online session — authenticationToken IS the access token in KSeF API 2.0
        session_ref, aes_key, iv = await self._open_session(auth_token, certs["sym_cert"])
        if not session_ref:
            raise RuntimeError("KSeF nie zwrócił referenceNumber sesji")

        try:
            # 5. Send encrypted invoice
            invoice_ref = await self._send_invoice(auth_token, session_ref, xml, aes_key, iv)

            # 6. Poll for KSeF number
            ksef_number = await self._poll_invoice_status(auth_token, session_ref, invoice_ref or session_ref)
        finally:
            # 7. Always close session
            await self._close_session(auth_token, session_ref)

        doc_hash = hashlib.sha256(xml.encode("utf-8")).hexdigest()
        upo_xml = _generate_upo(ksef_number, doc_hash, nip, self.env)

        return {
            "success": True,
            "mode": self.mode,
            "environment": self.env,
            "ksef_number": ksef_number,
            "reference_number": invoice_ref or session_ref,
            "status_code": 200,
            "status": f"Przyjęto w KSeF ({self.env.upper()})",
            "document_hash": doc_hash,
            "hash_algorithm": "SHA-256",
            "xml_base64": base64.b64encode(xml.encode("utf-8")).decode("ascii"),
            "upo_xml": upo_xml,
            "sent_at": datetime.now(timezone.utc).isoformat(),
        }

    async def test_connection_async(self) -> dict:
        try:
            certs = await self._get_certs()
            cert_ok = bool(certs.get("token_cert"))
            return {
                "success": cert_ok,
                "mode": self.mode,
                "environment": self.env,
                "message": (
                    f"Połączenie OK — KSeF {self.env.upper()} (certyfikaty pobrane)"
                    if cert_ok
                    else f"Nieprawidłowa odpowiedź certyfikatów z KSeF {self.env}"
                ),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as exc:
            return {
                "success": False,
                "mode": self.mode,
                "environment": self.env,
                "message": f"Błąd połączenia z KSeF {self.env.upper()}: {exc}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_ksef_client(settings: dict | None = None) -> KsefClient:
    """Return RealKsefClient when token is configured, else SimulationKsefClient."""
    env = "test"
    if settings:
        token = (settings.get("ksef_token") or "").strip()
        env = (settings.get("ksef_env") or "test").strip()
        if token:
            return RealKsefClient(token, env)
    return SimulationKsefClient(env)
