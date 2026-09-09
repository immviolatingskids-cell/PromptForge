"""Local Control Centre adapter; catalogue logic remains in Populator."""
from dataclasses import asdict
from datetime import datetime, timezone
import json
from pathlib import Path
from threading import Lock
from populator.coverage import pool_coverage
from populator.deep_coverage import leaf_coverage
from populator.health import scan_health
from populator.backup import create_backup, list_history
from populator.templates import load_templates
from populator.hub_activity import catalogue_snapshot, catalogue_changes


def now():
    return datetime.now(timezone.utc).isoformat()


class HubService:
    def __init__(self, root):
        self.root = Path(root)
        self.data = self.root / "data"
        self.lock = Lock()
        self.state_path = self.root / ".personaforge" / "control-centre.json"

    def read(self):
        try:
            value = json.loads(self.state_path.read_text(encoding="utf-8"))
            return value if isinstance(value, dict) else {}
        except (OSError, ValueError):
            return {}

    def save(self, state):
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.state_path.with_suffix(".tmp")
        temporary.write_text(json.dumps(state, ensure_ascii=False), encoding="utf-8")
        temporary.replace(self.state_path)

    def backups(self):
        return [{"name":p.name, "size":p.stat().st_size, "at":datetime.fromtimestamp(p.stat().st_mtime, timezone.utc).isoformat(), "url":"/backups/" + p.name}
                for p in sorted((self.root / "backups").glob("persona_data_backup_*.zip"), reverse=True)]

    def snapshot(self):
        pools = [{**asdict(p), "kind":"catalogue"} for p in pool_coverage(self.data)]
        deep = [{**p, "kind":"deep"} for p in leaf_coverage(self.data)]
        primary = [p for p in pools if p["subcategory"] is None]
        snapshot = catalogue_snapshot(self.data, primary)
        with self.lock:
            state = self.read()
            changes = catalogue_changes(state.get("catalogue_snapshot"), snapshot, now())
            if state.get("catalogue_snapshot") != snapshot:
                state["activity"] = (changes + state.get("activity", []))[:200]
                state["catalogue_snapshot"] = snapshot
                self.save(state)
        versions = {}
        for name in ("schema_version", "data_version"):
            versions.update(json.loads((self.data / (name + ".json")).read_text(encoding="utf-8")))
        versions["package_version"] = json.loads((self.root / "package.json").read_text())["version"]
        return {"at":now(), "pools":pools + deep, "entries":sum(p["count"] for p in primary),
                "catalogues":len(primary), "deep_pools":len(deep), "templates":len(load_templates(self.data)),
                "versions":versions, "audit":state.get("audit"), "activity":state.get("activity", []),
                "backups":self.backups(), "operations":list_history(self.data)[-50:], "data_path":str(self.data)}

    def action(self, action):
        if action not in {"audit", "backup"}:
            raise ValueError("Unknown action")
        with self.lock:
            state = self.read()
            if action == "audit":
                result = {**scan_health(self.data), "at":now()}
                state["audit"] = result
            else:
                path = create_backup(self.data)
                result = {"name":path.name, "url":"/backups/" + path.name}
            state["activity"] = ([{"type":"diagnostics" if action == "audit" else "backups", "title":"Completed health audit" if action == "audit" else "Created catalogue backup", "at":now()}] + state.get("activity", []))[:200]
            self.save(state)
            return result
