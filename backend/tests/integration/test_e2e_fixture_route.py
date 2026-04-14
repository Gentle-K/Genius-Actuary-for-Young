import os
import unittest
from unittest.mock import patch

from tests.support import build_test_services, patched_test_client


class E2EFixtureRouteTests(unittest.TestCase):
    def test_seed_ready_session_route_advances_to_a_report_ready_state(self):
        services = build_test_services()
        env = {
            "APP_ENV": "test",
            "DEBUG_USERNAME": "debug-admin",
            "DEBUG_PASSWORD": "codex-e2e-secret",
        }

        with patch.dict(os.environ, env, clear=False):
            with patched_test_client(services) as client:
                response = client.post(
                    "/api/debug/e2e/seed-ready-session",
                    auth=("debug-admin", "codex-e2e-secret"),
                    json={
                        "locale": "en",
                        "mode": "strategy_compare",
                        "problem_statement": (
                            "Allocate idle USDT from the wallet into one eligible "
                            "HashKey Chain RWA sleeve."
                        ),
                    },
                )

                self.assertEqual(200, response.status_code, response.text)
                payload = response.json()
                self.assertEqual("READY_FOR_EXECUTION", payload["status"])
                self.assertTrue(payload["report_ready"])
                self.assertTrue(payload["report_url"].startswith("/reports/"))
                self.assertTrue(payload["execute_url"].endswith("/execute"))

                session_response = client.get(f"/api/sessions/{payload['session_id']}")
                self.assertEqual(200, session_response.status_code, session_response.text)
                session = session_response.json()
                self.assertEqual(payload["session_id"], session["session_id"])
                self.assertEqual("READY_FOR_EXECUTION", session["status"])


if __name__ == "__main__":
    unittest.main()
