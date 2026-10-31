PiSyncHub
Unified multi-node dashboard, real-time telemetry aggregator, and selective sync engine purpose-built for Pi-hole v6.
⚠️ Early Release / Testing Notice: PiSyncHub is currently in active early development and requires ongoing testing. Features, sync behavior, and endpoints may change as builds progress. Please ensure you maintain backups of your Pi-hole instances before syncing configurations.
Overview
Managing multiple Pi-hole instances for high availability often leads to fragmented metrics, desynchronized blocklists, and administrative overhead. PiSyncHub unifies your entire Pi-hole v6 cluster into a single, high-performance interface.
It polls your nodes concurrently, aggregates time-series telemetry into synchronized 24-hour charts, provides an instant network-wide blocking kill switch, and allows selective bi-directional syncing of adlists and domain rules across servers.
Key Features
Aggregated 24-Hour Time Series: Continuously syncs 10-minute query buckets across all online nodes to present combined Permitted, Cached, and Blocked stacked bar charts alongside top client activity curves.
Cluster DNS Overview: Unified KPI metrics reporting total cluster queries, blocked queries, overall cache percentage, total blocklist capacity, and live cluster queries per minute (QPM).
Distribution Visualizations: Interactive donut breakdowns for upstream DNS destination resolution and query types across your entire fleet.
Top Metrics Aggregation: Consolidated rankings for top permitted domains, top blocked domains, and most active client IP addresses/hostnames.
Global Blocking Control: Pause or resume DNS ad-blocking cluster-wide with a single click, with support for automated timed resumption.
Selective Teleporter Sync: Push adlists, exact allow/deny rules, wildcards, and regex filters from a source node to any target node without destructive overwrites.
Teleporter Archive Vault: Extract, store, and manage timestamped Teleporter .zip backups directly to container storage with one-click restore capabilities.
Individual Node Management: Inspect each node's active adlists, custom domain lists, upstream DNS servers, and trigger gravity updates remotely.
Integrated Admin Security: Self-contained local authentication with salted PBKDF2 password hashing, secure cookie sessions, and an integrated container log viewer.
Dark & Light Mode: Clean, responsive dashboard designed for mobile, tablet, and desktop viewports.
Requirements
Pi-hole v6: PiSyncHub communicates natively with the Pi-hole v6 REST API (/api/*).
Web Password / App Token: Required for authenticated endpoints (stats, history, blocking toggle, teleporter).
unRAID Installation
PiSyncHub is designed to be easily deployed via the unRAID Community Applications store.
In the unRAID WebUI, navigate to the Apps tab.
Search for PiSyncHub.
Click Install.
Verify the default settings:
Container Port: 8085
Appdata Storage: /mnt/user/appdata/pisynchub mapped to /config
Click Apply and launch the WebUI.
Storage Note: If your unRAID appdata cache pool or share is stored in an alternate location (e.g., /mnt/cache/appdata/pisynchub), ensure you adjust the host path accordingly in the unRAID container template settings before starting.
Standalone Docker / Docker Compose
Docker Run
docker run -d \
  --name pisynchub \
  -p 8085:8085 \
  -v /mnt/user/appdata/pisynchub:/config \
  --restart unless-stopped \
  meminiau/pisynchub-dev:latest


Docker Compose
services:
  pisynchub:
    image: meminiau/pisynchub-dev:latest
    container_name: pisynchub
    restart: unless-stopped
    ports:
      - "8085:8085"
    volumes:
      - /mnt/user/appdata/pisynchub:/config
    environment:
      - PORT=8085


Configuration & First Launch
Initial Setup: On first launch, navigate to http://<your-server-ip>:8085. You will be prompted to create an administrator username and password.
Adding Pi-hole Nodes:
Click Add Node on the dashboard.
Node Name: A friendly label for the node (e.g., Primary-Server, Backup-DNS).
Node URL: The base HTTP/HTTPS URL of your Pi-hole instance without trailing slashes or /admin (e.g., http://192.168.0.2 or http://192.168.0.9:8080).
API Key / Password: The administrative password or API token used to log into that Pi-hole's web interface.
Data Polling: Once connected, PiSyncHub immediately begins fetching cluster statistics, upstream distributions, top items, and 24-hour historical query buckets.
Directory Structure
Data persisted inside the /config host volume:
/config/
├── auth.json       # Salted PBKDF2 administrative credentials
├── nodes.json      # Configured Pi-hole node connections
└── backups/        # Downloaded Teleporter archive .zip files


License
Distributed under the MIT License. See LICENSE for more information.
