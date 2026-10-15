"""Release boundaries: no private credentials in settings or public configuration."""
import json
from pathlib import Path
import tempfile
import unittest
from build_release import validate_public
from portable import read_settings


class ReleaseTests(unittest.TestCase):
    def test_rejects_admin_and_malformed_public_config(self):
        for key in ["sb_secret_admin", "not-a-public-key", "ey.a.b"]:
            with self.assertRaises(ValueError):
                validate_public({"url": "https://example.supabase.co", "key": key})
        with self.assertRaises(ValueError):
            validate_public({"url": "http://example.test", "key": "sb_publishable_demo"})
        self.assertEqual(validate_public({"url": "https://example.supabase.co", "key": "sb_publishable_demo"})["key"], "sb_publishable_demo")

    def test_preferences_restore_excludes_credentials_and_task_data(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "settings.json"
            path.write_text(json.dumps({"language": "en", "task_geometry": "380x520+1+2", "session": {"access_token": "secret"}, "password": "secret", "tasks": ["private"], "calendar_geometry": {"not": "text"}}))
            self.assertEqual(read_settings(path), {"language": "en", "task_geometry": "380x520+1+2"})
            path.write_text("corrupt")
            self.assertEqual(read_settings(path), {})


if __name__ == "__main__":
    unittest.main()
