import os
import io
import json
import secrets
import hashlib
import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any
from collections import deque
import logging

import httpx
from fastapi import FastAPI, Request, Response, HTTPException, UploadFile, File, Form, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel

# In-memory circular log buffer to serve container logs directly in the UI
LOG_BUFFER = deque(maxlen=1000)

class BufferLogHandler(logging.Handler):
    def emit(self, record):
        try:
            msg = self.format(record)
            LOG_BUFFER.append(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [{record.levelname}] {msg}")
        except Exception:
            pass

logger = logging.getLogger("pisynchub")
logger.setLevel(logging.INFO)
buffer_handler = BufferLogHandler()
buffer_handler.setFormatter(logging.Formatter('%(message)s'))
logger.addHandler(buffer_handler)
logging.getLogger("uvicorn").addHandler(buffer_handler)

app = FastAPI(title="PiSyncHub", version="1.0.0")

CONFIG_DIR = os.environ.get("CONFIG_DIR", "/config")
try:
    os.makedirs(CONFIG_DIR, exist_ok=True)
    os.makedirs(os.path.join(CONFIG_DIR, "backups"), exist_ok=True)
except OSError:
    CONFIG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config")
    os.makedirs(CONFIG_DIR, exist_ok=True)
    os.makedirs(os.path.join(CONFIG_DIR, "backups"), exist_ok=True)

AUTH_FILE = os.path.join(CONFIG_DIR, "auth.json")
NODES_FILE = os.path.join(CONFIG_DIR, "nodes.json")
BACKUPS_DIR = os.path.join(CONFIG_DIR, "backups")

ACTIVE_SESSIONS = set()
NETWORK_BLOCKING_STATE = {"enabled": True, "timer": None, "updated_at": None}

logger.info("PiSyncHub initialized. Storage directory: %s", CONFIG_DIR)

# --- Auth Helpers ---
def hash_password(password: str, salt: str = None) -> tuple[str, str]:
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return key.hex(), salt

def verify_password(stored_hash: str, salt: str, password: str) -> bool:
    new_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(stored_hash, new_hash)

def is_setup_completed() -> bool:
    return os.path.exists(AUTH_FILE)

def load_auth():
    if not is_setup_completed():
        return None
    try:
        with open(AUTH_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return None

def check_auth_token(request: Request) -> bool:
    if not is_setup_completed():
        return False
    token = request.cookies.get("pisync_session")
    return bool(token and token in ACTIVE_SESSIONS)

def load_nodes() -> List[Dict[str, Any]]:
    if not os.path.exists(NODES_FILE):
        return []
    try:
        with open(NODES_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []

def save_nodes(nodes: List[Dict[str, Any]]):
    with open(NODES_FILE, "w") as f:
        json.dump(nodes, f, indent=4)

# --- Models ---
class AuthModel(BaseModel):
    username: str
    password: str

class NodeModel(BaseModel):
    name: str
    url: str
    api_key: Optional[str] = ""

class SyncRequestModel(BaseModel):
    source_index: int
    target_indices: List[int]
    sync_adlists: bool = True
    sync_domains: bool = True
    sync_groups: bool = False
    sync_local_dns: bool = False

class BlockingRequestModel(BaseModel):
    enabled: bool
    timer: Optional[int] = None
    node_index: Optional[int] = None

# --- Pi-hole v6 Session & Helper Engine ---
async def get_pihole_session(client: httpx.AsyncClient, base_url: str, password: str) -> tuple[dict, Optional[str]]:
    headers = {}
    if not password:
        return headers, None
    try:
        r = await client.post(f"{base_url}/api/auth", json={"password": password}, timeout=4.0)
        if r.status_code == 200:
            sid = r.json().get("session", {}).get("sid")
            if sid:
                headers["sid"] = sid
                headers["X-FTL-SID"] = sid
                client.cookies.set("sid", sid)
                return headers, sid
    except Exception as e:
        logger.warning("Auth failure to %s: %s", base_url, e)
    return headers, None

def normalize_upstreams(raw_upstreams: Any) -> Dict[str, int]:
    normalized: Dict[str, int] = {}
    if isinstance(raw_upstreams, list):
        for item in raw_upstreams:
            if isinstance(item, dict):
                name = item.get("name") or item.get("ip") or item.get("server") or item.get("address") or "upstream"
                port = item.get("port")
                label = f"{name}#{port}" if (port and f"#{port}" not in str(name) and str(name) not in ("cache", "blocklist")) else str(name)
                count = int(item.get("count", item.get("queries", 0)) or 0)
                if count > 0:
                    normalized[label] = normalized.get(label, 0) + count
    elif isinstance(raw_upstreams, dict):
        inner = raw_upstreams.get("upstreams", raw_upstreams)
        if isinstance(inner, list):
            return normalize_upstreams(inner)
        elif isinstance(inner, dict):
            for k, v in inner.items():
                if isinstance(v, dict):
                    label = v.get("name") or v.get("ip") or (k if not str(k).isdigit() else "upstream")
                    port = v.get("port")
                    if port and f"#{port}" not in str(label) and str(label) not in ("cache", "blocklist"):
                        label = f"{label}#{port}"
                    count = int(v.get("count", v.get("queries", 0)) or 0)
                else:
                    label = str(k) if not str(k).isdigit() else f"upstream-{k}"
                    count = int(v or 0)
                if count > 0:
                    normalized[str(label)] = normalized.get(str(label), 0) + count
    return normalized

# --- Auth Endpoints ---
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "PiSyncHub"}

@app.get("/api/auth/status")
def auth_status(request: Request):
    auth_data = load_auth()
    logged_in = check_auth_token(request)
    return {
        "setup_required": not is_setup_completed(),
        "logged_in": logged_in,
        "authenticated": logged_in,
        "username": auth_data.get("username") if (auth_data and logged_in) else None
    }

@app.post("/api/auth/setup")
def auth_setup(creds: AuthModel, response: Response):
    if is_setup_completed():
        raise HTTPException(status_code=400, detail="Setup already completed")
    user = creds.username.strip()
    pwd = creds.password.strip()
    if not user or not pwd:
        raise HTTPException(status_code=400, detail="Username and password required")
    if len(pwd) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    pwd_hash, salt = hash_password(pwd)
    with open(AUTH_FILE, "w") as f:
        json.dump({"username": user, "password_hash": pwd_hash, "salt": salt}, f, indent=4)

    token = secrets.token_hex(32)
    ACTIVE_SESSIONS.add(token)
    response.set_cookie(key="pisync_session", value=token, httponly=True, samesite="lax")
    logger.info("Admin setup completed for user: %s", user)
    return {"status": "success", "username": user}

@app.post("/api/auth/login")
def auth_login(creds: AuthModel, response: Response):
    if not is_setup_completed():
        raise HTTPException(status_code=400, detail="Setup required")
    auth_data = load_auth()
    user = creds.username.strip()
    pwd = creds.password.strip()
    if auth_data and user == auth_data.get("username"):
        if verify_password(auth_data.get("password_hash"), auth_data.get("salt"), pwd):
            token = secrets.token_hex(32)
            ACTIVE_SESSIONS.add(token)
            response.set_cookie(key="pisync_session", value=token, httponly=True, samesite="lax")
            logger.info("User logged in: %s", user)
            return {"status": "success", "username": user}
    logger.warning("Failed login attempt for: %s", user)
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/auth/logout")
def auth_logout(request: Request, response: Response):
    token = request.cookies.get("pisync_session")
    if token in ACTIVE_SESSIONS:
        ACTIVE_SESSIONS.remove(token)
    response.delete_cookie("pisync_session")
    return {"status": "success"}

# --- System Logs Endpoint ---
@app.get("/api/system/logs")
def get_system_logs(request: Request):
    if not check_auth_token(request):
        raise HTTPException(status_code=401, detail="Auth required")
    return {"status": "success", "logs": list(LOG_BUFFER)}

# --- Node Endpoints ---
@app.get("/api/nodes")
def get_nodes(request: Request):
    if not check_auth_token(request):
        raise HTTPException(status_code=401, detail="Auth required")
    return {"status": "success", "nodes": load_nodes()}

@app.post("/api/nodes")
def add_node(node: NodeModel, request: Request):
    if not check_auth_token(request):
        raise HTTPException(status_code=401, detail="Auth required")
    name = node.name.strip()
    url = node.url.strip().rstrip("/")
    if not name or not url:
        raise HTTPException(status_code=400, detail="Name and URL are required")
    nodes = load_nodes()
    nodes.append({"name": name, "url": url, "api_key": node.api_key.strip()})
    save_nodes(nodes)
    logger.info("Added node: %s (%s)", name, url)
    return {"status": "success", "nodes": nodes}

@app.delete("/api/nodes/{index}")
def delete_node(index: int, request: Request):
    if not check_auth_token(request):
        raise HTTPException(status_code=401, detail="Auth required")
    nodes = load_nodes()
    if 0 <= index < len(nodes):
        removed = nodes.pop(index)
        save_nodes(nodes)
        logger.info("Deleted node: %s", removed.get("name"))
        return {"status": "success", "removed": removed, "nodes": nodes}
    raise HTTPException(status_code=404, detail="Node index not found")

# --- Manage Node Configuration Endpoints (Fixes SyntaxError) ---
@app.get("/api/nodes/{index}/config")
async def get_node_config(index: int, request: Request):
    if not check_auth_token(request):
        raise HTTPException(status_code=401, detail="Auth required")
    nodes = load_nodes()
    if index < 0 or index >= len(nodes):
        raise HTTPException(status_code=404, detail="Node index not found")
    node = nodes[index]
    base_url = node.get("url", "").rstrip("/")
    password = node.get("api_key", "")

    adlists = []
    domains = []
    upstreams = []
    dnssec = True

    async with httpx.AsyncClient(timeout=6.0) as client:
        headers, _ = await get_pihole_session(client, base_url, password)
        try:
            r = await client.get(f"{base_url}/api/lists", headers=headers)
            if r.status_code == 200:
                raw_lists = r.json().get("lists", [])
                adlists = [
                    {
                        "id": str(item.get("id", idx)),
                        "url": item.get("address", ""),
                        "comment": item.get("comment", ""),
                        "enabled": item.get("enabled", True),
                        "domain_count": item.get("number", 0),
                        "status": "active" if item.get("enabled", True) else "disabled"
                    }
                    for idx, item in enumerate(raw_lists)
                ]
        except Exception as e:
            logger.warning("Could not fetch lists from %s: %s", node["name"], e)

        try:
            r = await client.get(f"{base_url}/api/domains", headers=headers)
            if r.status_code == 200:
                raw_domains = r.json().get("domains", [])
                domains = [
                    {
                        "id": str(item.get("id", idx)),
                        "domain": item.get("domain", ""),
                        "type": item.get("type", "allow"),
                        "kind": item.get("kind", "exact"),
                        "comment": item.get("comment", ""),
                        "enabled": item.get("enabled", True),
                        "date_added": item.get("date_added", "")
                    }
                    for idx, item in enumerate(raw_domains)
                ]
        except Exception as e:
            logger.warning("Could not fetch domains from %s: %s", node["name"], e)

        try:
            r = await client.get(f"{base_url}/api/config/dns", headers=headers)
            if r.status_code == 200:
                dns_cfg = r.json().get("dns", {})
                dnssec = dns_cfg.get("dnssec", True)
                for u in dns_cfg.get("upstreams", []):
                    upstreams.append({
                        "id": str(u),
                        "name": str(u),
                        "ip": str(u).split("#")[0],
                        "port": int(str(u).split("#")[1]) if "#" in str(u) else 53,
                        "enabled": True
                    })
        except Exception:
            pass

    return {
        "upstreams": upstreams,
        "dnssec_enabled": dnssec,
        "conditional_forwarding": False,
        "domains": domains,
        "adlists": adlists,
        "raw_config": {
            "node_name": node["name"],
            "base_url": base_url
        }
    }

@app.post("/api/nodes/{index}/gravity/update")
async def update_gravity(index: int, request: Request):
    if not check_auth_token(request):
        raise HTTPException(status_code=401, detail="Auth required")
    nodes = load_nodes()
    if index < 0 or index >= len(nodes):
        raise HTTPException(status_code=404, detail="Node index not found")
    node = nodes[index]
    base_url = node.get("url", "").rstrip("/")
    password = node.get("api_key", "")

    async with httpx.AsyncClient(timeout=60.0) as client:
        headers, _ = await get_pihole_session(client, base_url, password)
        try:
            r = await client.post(f"{base_url}/api/action/gravity", headers=headers)
            logger.info("Gravity updated on %s", node["name"])
            return {"status": "success", "detail": f"Gravity updated on {node['name']}", "domains": 0}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to trigger gravity: {str(e)}")


                    
# --- Node Telemetry & 24h History Poller ---
async def fetch_node_stats(node: Dict[str, Any]) -> Dict[str, Any]:
    base_url = node.get("url", "").rstrip("/")
    password = node.get("api_key", "")

    async with httpx.AsyncClient(timeout=6.0) as client:
        headers, _ = await get_pihole_session(client, base_url, password)
        try:
            resp = await client.get(f"{base_url}/api/stats/summary", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                q_data = data.get("queries", {}) if isinstance(data.get("queries"), dict) else data
                total_q = q_data.get("total", data.get("total_queries", 0))
                blocked_q = q_data.get("blocked", data.get("blocked_queries", 0))
                cached_q = q_data.get("cached", data.get("queries_cached", 0))
                pct = q_data.get("percent_blocked", data.get("percent_blocked", 0.0))
                qpm = round(float(q_data.get("frequency", 0.0)) * 60, 1) if q_data.get("frequency") else round(total_q / 1440.0, 1)

                g_data = data.get("gravity", {}) if isinstance(data.get("gravity"), dict) else {}
                gravity_size = g_data.get("domains_being_blocked", data.get("domains_being_blocked", 0))

                qtypes = q_data.get("types", {}) if isinstance(q_data.get("types"), dict) else {}
                upstreams: Dict[str, int] = {}
                top_items: Dict[str, Any] = {}
                history_data: Dict[str, Any] = {}
                blocking_enabled = NETWORK_BLOCKING_STATE["enabled"]

                if not qtypes:
                    try:
                        qt_r = await client.get(f"{base_url}/api/stats/querytypes", headers=headers)
                        if qt_r.status_code == 200:
                            qtypes = qt_r.json().get("types", {})
                    except Exception:
                        pass

                try:
                    up_r = await client.get(f"{base_url}/api/stats/upstreams", headers=headers)
                    if up_r.status_code == 200:
                        upstreams = normalize_upstreams(up_r.json())
                except Exception:
                    pass

                if cached_q and "cache" not in upstreams:
                    upstreams["cache"] = int(cached_q)
                if blocked_q and "blocklist" not in upstreams:
                    upstreams["blocklist"] = int(blocked_q)

                # Fetch real Top Items
                try:
                    td_p = await client.get(f"{base_url}/api/stats/top_domains?blocked=false&count=10", headers=headers)
                    td_b = await client.get(f"{base_url}/api/stats/top_domains?blocked=true&count=10", headers=headers)
                    tc_a = await client.get(f"{base_url}/api/stats/top_clients?blocked=false&count=10", headers=headers)
                    tc_b = await client.get(f"{base_url}/api/stats/top_clients?blocked=true&count=10", headers=headers)
                    if td_p.status_code == 200:
                        top_items["top_permitted"] = td_p.json().get("domains", [])
                    if td_b.status_code == 200:
                        top_items["top_blocked"] = td_b.json().get("domains", [])
                    if tc_a.status_code == 200:
                        top_items["top_clients"] = tc_a.json().get("clients", [])
                    if tc_b.status_code == 200:
                        top_items["top_clients_blocked"] = tc_b.json().get("clients", [])
                except Exception:
                    pass

                # Fetch 24-Hour Time-Series History
                try:
                    hr = await client.get(f"{base_url}/api/history", headers=headers)
                    if hr.status_code == 200:
                        history_data = hr.json().get("history", hr.json())
                except Exception:
                    pass

                try:
                    b_r = await client.get(f"{base_url}/api/dns/blocking", headers=headers)
                    if b_r.status_code == 200:
                        b_state = b_r.json().get("blocking", "enabled")
                        blocking_enabled = (b_state == "enabled" or b_state is True)
                except Exception:
                    pass

                return {
                    "name": node.get("name", "Pi-hole"),
                    "url": base_url,
                    "online": True,
                    "blocking_enabled": blocking_enabled,
                    "queries": total_q,
                    "blocked": blocked_q,
                    "cached": cached_q,
                    "percent_blocked": round(float(pct), 1) if pct else 0.0,
                    "gravity_size": gravity_size,
                    "qpm": qpm,
                    "cpu_load": round(float(data.get("system", {}).get("cpu_load", 5.0)), 1) if isinstance(data.get("system"), dict) else 5.0,
                    "querytypes": qtypes,
                    "upstreams": upstreams,
                    "top_items": top_items,
                    "history": history_data,
                    "status": "online"
                }
            else:
                logger.warning("Node %s returned status %d", node.get("name"), resp.status_code)
        except Exception as e:
            logger.warning("Node %s offline check: %s", node.get("name"), e)

    return {
        "name": node.get("name", "Pi-hole"),
        "url": base_url,
        "online": False,
        "blocking_enabled": NETWORK_BLOCKING_STATE["enabled"],
        "queries": 0,
        "blocked": 0,
        "cached": 0,
        "percent_blocked": 0.0,
        "gravity_size": 0,
        "qpm": 0.0,
        "cpu_load": 0.0,
        "querytypes": {},
        "upstreams": {},
        "top_items": {},
        "history": {},
        "status": "offline"
    }
    
@app.get("/api/dashboard/stats")
async def get_dashboard_stats(request: Request):
    if not check_auth_token(request):
        raise HTTPException(status_code=401, detail="Auth required")
    nodes = load_nodes()
    tasks = [fetch_node_stats(n) for n in nodes]
    results = await asyncio.gather(*tasks) if tasks else []

    # Aggregate 24-hour time series history from all online nodes
    history_buckets: Dict[int, Dict[str, int]] = {}
    aggregated_clients: Dict[str, int] = {}
    total_cluster_queries = 0

    for n in results:
        if not n.get("online"):
            continue
        
        # Aggregate top client counts for the client activity chart
        for c in n.get("top_items", {}).get("top_clients", []):
            c_name = c.get("name") or c.get("ip") or c.get("client") or "Client"
            c_count = int(c.get("count") or c.get("queries") or 0)
            if c_count > 0:
                aggregated_clients[c_name] = aggregated_clients.get(c_name, 0) + c_count
                total_cluster_queries += c_count

        raw_history = n.get("history", {})
        history_list = []
        if isinstance(raw_history, list):
            history_list = raw_history
        elif isinstance(raw_history, dict):
            if "history" in raw_history and isinstance(raw_history["history"], list):
                history_list = raw_history["history"]
            else:
                for k, v in raw_history.items():
                    if isinstance(v, dict):
                        item = dict(v)
                        if "timestamp" not in item and "time" not in item:
                            try:
                                item["timestamp"] = int(k)
                            except ValueError:
                                pass
                        history_list.append(item)

        for entry in history_list:
            if not isinstance(entry, dict):
                continue
            ts = entry.get("timestamp") or entry.get("time") or entry.get("ts")
            try:
                ts = int(ts)
            except (TypeError, ValueError):
                continue

            # Bucket into synchronized 10-minute intervals (600s)
            bucket_ts = (ts // 600) * 600
            if bucket_ts not in history_buckets:
                history_buckets[bucket_ts] = {"total": 0, "cached": 0, "blocked": 0}

            t_val = int(entry.get("total") or entry.get("queries") or entry.get("query_count") or 0)
            c_val = int(entry.get("cached") or entry.get("queries_cached") or 0)
            b_val = int(entry.get("blocked") or entry.get("queries_blocked") or entry.get("ads") or 0)

            history_buckets[bucket_ts]["total"] += t_val
            history_buckets[bucket_ts]["cached"] += c_val
            history_buckets[bucket_ts]["blocked"] += b_val

    labels = []
    permitted = []
    cached = []
    blocked = []
    totals = []

    # Sort buckets chronologically (last 24 hours / up to 144 intervals)
    sorted_ts = sorted(history_buckets.keys())
    if len(sorted_ts) > 144:
        sorted_ts = sorted_ts[-144:]

    for bts in sorted_ts:
        dt = datetime.fromtimestamp(bts)
        labels.append(dt.strftime("%H:%M"))
        t = history_buckets[bts]["total"]
        c = history_buckets[bts]["cached"]
        b = history_buckets[bts]["blocked"]
        p = max(0, t - b - c)
        permitted.append(p)
        cached.append(c)
        blocked.append(b)
        totals.append(t)

    # Build client activity curves for top 5 clients across the time series
    client_series: Dict[str, List[int]] = {}
    top_5_clients = sorted(aggregated_clients.items(), key=lambda x: x[1], reverse=True)[:5]
    if totals and total_cluster_queries > 0:
        for c_name, count in top_5_clients:
            ratio = count / total_cluster_queries
            client_series[c_name] = [max(0, round(t * ratio)) for t in totals]

    aggregated_history = {
        "labels": labels,
        "permitted": permitted,
        "cached": cached,
        "blocked": blocked,
        "client_series": client_series
    }

    return {
        "status": "success",
        "blocking": NETWORK_BLOCKING_STATE,
        "nodes": results,
        "history": aggregated_history
    }
    

@app.get("/api/blocking/status")
def get_blocking_status(request: Request):
    if not check_auth_token(request):
        raise HTTPException(status_code=401, detail="Auth required")
    return {"status": "success", **NETWORK_BLOCKING_STATE}

@app.post("/api/blocking/toggle")
async def set_blocking_status(req: BlockingRequestModel, request: Request):
    if not check_auth_token(request):
        raise HTTPException(status_code=401, detail="Auth required")
    NETWORK_BLOCKING_STATE["enabled"] = req.enabled
    NETWORK_BLOCKING_STATE["timer"] = req.timer
    NETWORK_BLOCKING_STATE["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    nodes = load_nodes()
    target_nodes = (
        [nodes[req.node_index]]
        if req.node_index is not None and 0 <= req.node_index < len(nodes)
        else nodes
    )
    results = []
    async with httpx.AsyncClient(timeout=6.0) as client:
        for n in target_nodes:
            base_url = n.get("url", "").rstrip("/")
            headers, _ = await get_pihole_session(client, base_url, n.get("api_key", ""))
            try:
                payload: Dict[str, Any] = {"blocking": req.enabled}
                if req.timer is not None:
                    payload["timer"] = req.timer
                r = await client.post(f"{base_url}/api/dns/blocking", headers=headers, json=payload)
                results.append({"node": n.get("name"), "ok": r.status_code == 200})
            except Exception as e:
                results.append({"node": n.get("name"), "ok": False, "detail": str(e)})

    return {"status": "success", **NETWORK_BLOCKING_STATE, "results": results}

# --- Teleporter Backup & Restore Engine ---
@app.get("/api/backups")
def list_backups(request: Request):
    if not check_auth_token(request):
        raise HTTPException(status_code=401, detail="Auth required")
    files = []
    for f in sorted(os.listdir(BACKUPS_DIR), reverse=True):
        if f.endswith(".zip"):
            path = os.path.join(BACKUPS_DIR, f)
            files.append({
                "filename": f,
                "size_kb": round(os.path.getsize(path) / 1024, 1),
                "created": datetime.fromtimestamp(os.path.getmtime(path)).strftime("%Y-%m-%d %H:%M:%S")
            })
    return {"status": "success", "backups": files}

@app.post("/api/backups/create/{index}")
async def backup_node(index: int, request: Request):
    if not check_auth_token(request):
        raise HTTPException(status_code=401, detail="Auth required")
    nodes = load_nodes()
    if index < 0 or index >= len(nodes):
        raise HTTPException(status_code=404, detail="Node not found")
    node = nodes[index]

    async with httpx.AsyncClient(timeout=30.0) as client:
        headers, _ = await get_pihole_session(client, node["url"], node.get("api_key", ""))
        try:
            r = await client.get(f"{node['url']}/api/teleporter", headers=headers)
            if r.status_code == 200:
                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                clean_name = "".join(c for c in node["name"] if c.isalnum() or c in ("-", "_"))
                fname = f"teleporter_{clean_name}_{ts}.zip"
                dest = os.path.join(BACKUPS_DIR, fname)
                with open(dest, "wb") as f:
                    f.write(r.content)
                logger.info("Backup created: %s", fname)
                return {"status": "success", "filename": fname, "size": len(r.content)}
            raise HTTPException(status_code=r.status_code, detail=f"Pi-hole returned HTTP {r.status_code}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch teleporter archive: {str(e)}")

@app.get("/api/backups/download/{filename}")
def download_backup(filename: str, request: Request):
    if not check_auth_token(request):
        raise HTTPException(status_code=401, detail="Auth required")
    safe_name = os.path.basename(filename)
    path = os.path.join(BACKUPS_DIR, safe_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, media_type="application/zip", filename=safe_name)

@app.post("/api/backups/restore/{index}")
async def restore_node(index: int, request: Request, payload: Dict[str, str]):
    if not check_auth_token(request):
        raise HTTPException(status_code=401, detail="Auth required")
    nodes = load_nodes()
    if index < 0 or index >= len(nodes):
        raise HTTPException(status_code=404, detail="Node not found")
    node = nodes[index]
    filename = payload.get("filename")
    if not filename:
        raise HTTPException(status_code=400, detail="Filename required")

    path = os.path.join(BACKUPS_DIR, os.path.basename(filename))
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Backup file not found")

    with open(path, "rb") as f:
        content = f.read()

    async with httpx.AsyncClient(timeout=30.0) as client:
        headers, _ = await get_pihole_session(client, node["url"], node.get("api_key", ""))
        try:
            files_payload = {"file": (filename, io.BytesIO(content), "application/zip")}
            r = await client.post(f"{node['url']}/api/teleporter", headers=headers, files=files_payload)
            if r.status_code in (200, 204):
                logger.info("Restored %s into %s", filename, node["name"])
                return {"status": "success", "detail": f"Restored {filename} into {node['name']}"}
            return JSONResponse(status_code=r.status_code, content={"detail": r.text})
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to push restore: {str(e)}")

# --- Sync Engine ---
@app.post("/api/sync/execute")
async def trigger_sync(req: SyncRequestModel, request: Request):
    if not check_auth_token(request):
        raise HTTPException(status_code=401, detail="Auth required")
    nodes = load_nodes()
    if req.source_index < 0 or req.source_index >= len(nodes):
        raise HTTPException(status_code=400, detail="Invalid source node")

    source = nodes[req.source_index]
    sync_results = []

    async with httpx.AsyncClient(timeout=15.0) as client:
        s_headers, _ = await get_pihole_session(client, source["url"], source.get("api_key", ""))

        lists_data = []
        if req.sync_adlists:
            try:
                r = await client.get(f"{source['url']}/api/lists", headers=s_headers)
                if r.status_code == 200:
                    lists_data = r.json().get("lists", [])
                else:
                    sync_results.append(f"Lists fetch failed on {source['name']} ({r.status_code})")
            except Exception as e:
                sync_results.append(f"Lists fetch error: {str(e)}")

        domains_data = []
        if req.sync_domains:
            try:
                r = await client.get(f"{source['url']}/api/domains", headers=s_headers)
                if r.status_code == 200:
                    domains_data = r.json().get("domains", [])
                else:
                    sync_results.append(f"Domains fetch failed on {source['name']} ({r.status_code})")
            except Exception as e:
                sync_results.append(f"Domains fetch error: {str(e)}")

        for t_idx in req.target_indices:
            if t_idx == req.source_index or t_idx >= len(nodes):
                continue
            target = nodes[t_idx]
            t_headers, _ = await get_pihole_session(client, target["url"], target.get("api_key", ""))

            if req.sync_adlists and lists_data:
                try:
                    for item in lists_data:
                        await client.post(
                            f"{target['url']}/api/lists",
                            headers=t_headers,
                            json={
                                "address": item.get("address"),
                                "comment": item.get("comment", "PiSyncHub Sync"),
                                "enabled": item.get("enabled", True)
                            }
                        )
                    sync_results.append(f"Synced {len(lists_data)} adlists to {target['name']}")
                except Exception as ex:
                    sync_results.append(f"Adlists error on {target['name']}: {str(ex)}")

            if req.sync_domains and domains_data:
                try:
                    for d in domains_data:
                        await client.post(
                            f"{target['url']}/api/domains",
                            headers=t_headers,
                            json={
                                "domain": d.get("domain"),
                                "type": d.get("type", "allow"),
                                "kind": d.get("kind", "exact"),
                                "comment": d.get("comment", "PiSyncHub Sync"),
                                "enabled": d.get("enabled", True)
                            }
                        )
                    sync_results.append(f"Synced {len(domains_data)} domains to {target['name']}")
                except Exception as ex:
                    sync_results.append(f"Domains error on {target['name']}: {str(ex)}")

    logger.info("Executed sync from %s: %s", source["name"], sync_results)
    return {"status": "success", "log": sync_results}

# --- Static File Routing ---
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/icon.png")
def get_icon_png():
    if os.path.exists("icon.png"):
        return FileResponse("icon.png", media_type="image/png")
    return Response(status_code=404)
    
@app.get("/{full_path:path}")
def serve_frontend(full_path: str):
    static_file = os.path.join("static", full_path)
    if full_path and os.path.exists(static_file) and os.path.isfile(static_file):
        return FileResponse(static_file)
    return FileResponse("static/index.html")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 3000))
    uvicorn.run(app, host="0.0.0.0", port=port)
    
