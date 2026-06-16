"""Backend API tests for Faktura KSeF app."""
import requests
import sys
import json
from datetime import datetime, timedelta

BASE_URL = "https://faktura-app.preview.emergentagent.com/api"

class APITester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.token = None
        self.user_id = None
        self.results = []

    def log(self, test_name, passed, message="", response_data=None):
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            print(f"✅ {test_name}: PASSED")
        else:
            print(f"❌ {test_name}: FAILED - {message}")
        self.results.append({
            "test": test_name,
            "passed": passed,
            "message": message,
            "data": response_data
        })

    def test_health(self):
        """Test health endpoint"""
        try:
            resp = requests.get(f"{BASE_URL}/health", timeout=10)
            self.log("Health check", resp.status_code == 200, response_data=resp.json() if resp.status_code == 200 else None)
            return resp.status_code == 200
        except Exception as e:
            self.log("Health check", False, str(e))
            return False

    def test_register(self):
        """Test user registration"""
        email = f"test_{datetime.now().strftime('%Y%m%d%H%M%S')}@test.pl"
        payload = {
            "email": email,
            "password": "TestPass123!",
            "name": "Test User"
        }
        try:
            resp = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if "session_token" in data and "user" in data:
                    self.token = data["session_token"]
                    self.user_id = data["user"]["user_id"]
                    self.log("Register new user", True, response_data={"user_id": self.user_id})
                    return True
            self.log("Register new user", False, f"Status {resp.status_code}: {resp.text[:200]}")
            return False
        except Exception as e:
            self.log("Register new user", False, str(e))
            return False

    def test_login_admin(self):
        """Test login with admin credentials"""
        payload = {
            "email": "admin@faktura.pl",
            "password": "Admin123!"
        }
        try:
            resp = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if "session_token" in data:
                    self.token = data["session_token"]
                    self.user_id = data["user"]["user_id"]
                    self.log("Login admin", True, response_data={"user_id": self.user_id})
                    return True
            self.log("Login admin", False, f"Status {resp.status_code}: {resp.text[:200]}")
            return False
        except Exception as e:
            self.log("Login admin", False, str(e))
            return False

    def test_login_wrong_password(self):
        """Test login with wrong password returns 401"""
        payload = {
            "email": "admin@faktura.pl",
            "password": "WrongPassword123!"
        }
        try:
            resp = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
            passed = resp.status_code == 401
            self.log("Login wrong password (401)", passed, f"Got status {resp.status_code}")
            return passed
        except Exception as e:
            self.log("Login wrong password (401)", False, str(e))
            return False

    def test_auth_me(self):
        """Test /auth/me with Bearer token"""
        if not self.token:
            self.log("Auth /me", False, "No token available")
            return False
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            resp = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if "user_id" in data and "email" in data:
                    self.log("Auth /me", True, response_data=data)
                    return True
            self.log("Auth /me", False, f"Status {resp.status_code}: {resp.text[:200]}")
            return False
        except Exception as e:
            self.log("Auth /me", False, str(e))
            return False

    def test_dashboard_summary(self):
        """Test dashboard summary endpoint"""
        if not self.token:
            self.log("Dashboard summary", False, "No token")
            return False
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            resp = requests.get(f"{BASE_URL}/dashboard/summary", headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                required_keys = ["kpis", "bars", "revenue_pie", "recent_invoices", "top_clients", "health"]
                if all(k in data for k in required_keys):
                    self.log("Dashboard summary", True, response_data={"kpis": data["kpis"], "bars_count": len(data["bars"])})
                    return True
            self.log("Dashboard summary", False, f"Status {resp.status_code}: {resp.text[:200]}")
            return False
        except Exception as e:
            self.log("Dashboard summary", False, str(e))
            return False

    def test_companies_list(self):
        """Test companies list"""
        if not self.token:
            self.log("Companies list", False, "No token")
            return False
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            resp = requests.get(f"{BASE_URL}/companies", headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                self.log("Companies list", True, response_data={"count": len(data)})
                return True
            self.log("Companies list", False, f"Status {resp.status_code}: {resp.text[:200]}")
            return False
        except Exception as e:
            self.log("Companies list", False, str(e))
            return False

    def test_clients_list(self):
        """Test clients list"""
        if not self.token:
            self.log("Clients list", False, "No token")
            return False
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            resp = requests.get(f"{BASE_URL}/clients", headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                self.log("Clients list", True, response_data={"count": len(data)})
                return True
            self.log("Clients list", False, f"Status {resp.status_code}: {resp.text[:200]}")
            return False
        except Exception as e:
            self.log("Clients list", False, str(e))
            return False

    def test_invoices_list(self):
        """Test invoices list"""
        if not self.token:
            self.log("Invoices list", False, "No token")
            return False
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            resp = requests.get(f"{BASE_URL}/invoices", headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                self.log("Invoices list", True, response_data={"count": len(data)})
                return True
            self.log("Invoices list", False, f"Status {resp.status_code}: {resp.text[:200]}")
            return False
        except Exception as e:
            self.log("Invoices list", False, str(e))
            return False

    def test_expenses_list(self):
        """Test expenses list"""
        if not self.token:
            self.log("Expenses list", False, "No token")
            return False
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            resp = requests.get(f"{BASE_URL}/expenses", headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                self.log("Expenses list", True, response_data={"count": len(data)})
                return True
            self.log("Expenses list", False, f"Status {resp.status_code}: {resp.text[:200]}")
            return False
        except Exception as e:
            self.log("Expenses list", False, str(e))
            return False

    def test_templates_list(self):
        """Test templates list"""
        if not self.token:
            self.log("Templates list", False, "No token")
            return False
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            resp = requests.get(f"{BASE_URL}/templates", headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                self.log("Templates list", True, response_data={"count": len(data)})
                return True
            self.log("Templates list", False, f"Status {resp.status_code}: {resp.text[:200]}")
            return False
        except Exception as e:
            self.log("Templates list", False, str(e))
            return False

    def test_create_client(self):
        """Test creating a client"""
        if not self.token:
            self.log("Create client", False, "No token")
            return False
        payload = {
            "name": "Test Client Ltd",
            "nip": "1234567890",
            "street": "Test Street 1",
            "city": "Warsaw",
            "postal_code": "00-001",
            "country": "Polska"
        }
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            resp = requests.post(f"{BASE_URL}/clients", json=payload, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if "id" in data:
                    self.log("Create client", True, response_data={"client_id": data["id"]})
                    return data["id"]
            self.log("Create client", False, f"Status {resp.status_code}: {resp.text[:200]}")
            return False
        except Exception as e:
            self.log("Create client", False, str(e))
            return False

    def test_create_invoice(self):
        """Test creating an invoice"""
        if not self.token:
            self.log("Create invoice", False, "No token")
            return False
        
        today = datetime.now().strftime("%Y-%m-%d")
        payload = {
            "issue_date": today,
            "sale_date": today,
            "payment_method": "Przelew",
            "payment_term_days": 14,
            "currency": "PLN",
            "buyer": {
                "name": "Test Buyer",
                "nip": "9876543210",
                "street": "Buyer St 1",
                "city": "Krakow",
                "postal_code": "30-001",
                "country": "Polska"
            },
            "items": [
                {
                    "name": "Test Service",
                    "quantity": 1,
                    "unit": "szt",
                    "net_price": 1000.00,
                    "vat_rate": 23,
                    "vat_code": "23"
                }
            ]
        }
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            resp = requests.post(f"{BASE_URL}/invoices", json=payload, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if "id" in data and "number" in data:
                    self.log("Create invoice", True, response_data={"invoice_id": data["id"], "number": data["number"]})
                    return data["id"]
            self.log("Create invoice", False, f"Status {resp.status_code}: {resp.text[:200]}")
            return False
        except Exception as e:
            self.log("Create invoice", False, str(e))
            return False

    def test_send_invoice_ksef(self, invoice_id):
        """Test sending invoice to KSeF (simulation)"""
        if not self.token or not invoice_id:
            self.log("Send invoice to KSeF", False, "No token or invoice_id")
            return False
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            resp = requests.post(f"{BASE_URL}/invoices/{invoice_id}/send-ksef", headers=headers, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                if "ksef" in data and "ksef_number" in data["ksef"]:
                    ksef_num = data["ksef"]["ksef_number"]
                    # Check format: NIP-YYYYMMDD-...
                    if "-" in ksef_num and len(ksef_num) > 15:
                        self.log("Send invoice to KSeF", True, response_data={"ksef_number": ksef_num})
                        return True
            self.log("Send invoice to KSeF", False, f"Status {resp.status_code}: {resp.text[:200]}")
            return False
        except Exception as e:
            self.log("Send invoice to KSeF", False, str(e))
            return False

    def test_nip_validation(self):
        """Test NIP validation endpoint"""
        if not self.token:
            self.log("NIP validation", False, "No token")
            return False
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            payload = {"nip": "1234567890"}
            resp = requests.post(f"{BASE_URL}/tools/validate-nip", json=payload, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if "valid" in data:
                    self.log("NIP validation", True, response_data=data)
                    return True
            self.log("NIP validation", False, f"Status {resp.status_code}: {resp.text[:200]}")
            return False
        except Exception as e:
            self.log("NIP validation", False, str(e))
            return False

    def test_gus_lookup(self):
        """Test GUS lookup (simulation)"""
        if not self.token:
            self.log("GUS lookup", False, "No token")
            return False
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            payload = {"nip": "1234567890"}
            resp = requests.post(f"{BASE_URL}/tools/gus-lookup", json=payload, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if "found" in data and data["found"]:
                    self.log("GUS lookup (simulated)", True, response_data=data)
                    return True
            self.log("GUS lookup (simulated)", False, f"Status {resp.status_code}: {resp.text[:200]}")
            return False
        except Exception as e:
            self.log("GUS lookup (simulated)", False, str(e))
            return False

    def test_reports_revenue(self):
        """Test revenue report"""
        if not self.token:
            self.log("Reports revenue", False, "No token")
            return False
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            year = datetime.now().year
            resp = requests.get(f"{BASE_URL}/reports/revenue?year={year}", headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if "rows" in data and "totals" in data:
                    self.log("Reports revenue", True, response_data={"rows_count": len(data["rows"]), "totals": data["totals"]})
                    return True
            self.log("Reports revenue", False, f"Status {resp.status_code}: {resp.text[:200]}")
            return False
        except Exception as e:
            self.log("Reports revenue", False, str(e))
            return False

    def test_settings_get(self):
        """Test settings get"""
        if not self.token:
            self.log("Settings get", False, "No token")
            return False
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            resp = requests.get(f"{BASE_URL}/settings", headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                self.log("Settings get", True, response_data=data)
                return True
            self.log("Settings get", False, f"Status {resp.status_code}: {resp.text[:200]}")
            return False
        except Exception as e:
            self.log("Settings get", False, str(e))
            return False

    def test_logout(self):
        """Test logout"""
        if not self.token:
            self.log("Logout", False, "No token")
            return False
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            resp = requests.post(f"{BASE_URL}/auth/logout", headers=headers, timeout=10)
            passed = resp.status_code == 200
            self.log("Logout", passed, f"Status {resp.status_code}")
            return passed
        except Exception as e:
            self.log("Logout", False, str(e))
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("\n" + "="*60)
        print("BACKEND API TESTS - Faktura KSeF")
        print("="*60 + "\n")

        # Health check
        if not self.test_health():
            print("\n❌ Backend is not healthy. Stopping tests.")
            return False

        # Auth tests
        print("\n--- AUTH TESTS ---")
        self.test_register()
        self.test_login_admin()
        self.test_login_wrong_password()
        self.test_auth_me()

        # Dashboard
        print("\n--- DASHBOARD TESTS ---")
        self.test_dashboard_summary()

        # CRUD endpoints
        print("\n--- CRUD TESTS ---")
        self.test_companies_list()
        self.test_clients_list()
        self.test_invoices_list()
        self.test_expenses_list()
        self.test_templates_list()

        # Create operations
        print("\n--- CREATE OPERATIONS ---")
        client_id = self.test_create_client()
        invoice_id = self.test_create_invoice()

        # KSeF send
        print("\n--- KSEF TESTS ---")
        if invoice_id:
            self.test_send_invoice_ksef(invoice_id)

        # Tools
        print("\n--- TOOLS TESTS ---")
        self.test_nip_validation()
        self.test_gus_lookup()

        # Reports
        print("\n--- REPORTS TESTS ---")
        self.test_reports_revenue()

        # Settings
        print("\n--- SETTINGS TESTS ---")
        self.test_settings_get()

        # Logout
        print("\n--- LOGOUT TEST ---")
        self.test_logout()

        # Summary
        print("\n" + "="*60)
        print(f"TESTS COMPLETED: {self.tests_passed}/{self.tests_run} passed")
        print("="*60 + "\n")

        return self.tests_passed == self.tests_run


def main():
    tester = APITester()
    success = tester.run_all_tests()
    
    # Save results
    with open("/app/backend_test_results.json", "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total": tester.tests_run,
            "passed": tester.tests_passed,
            "failed": tester.tests_run - tester.tests_passed,
            "success_rate": round(100 * tester.tests_passed / tester.tests_run, 1) if tester.tests_run > 0 else 0,
            "results": tester.results
        }, f, indent=2)
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
