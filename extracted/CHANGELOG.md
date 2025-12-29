# Changelog

## [v8.5.1] - 2024-12-28
### Fixed
- **Cloudflare Proxy:** Disabled auto-proxy (orange cloud) on subdomain creation to prevent SSL/connection errors.
### Added
- **VPS Specs:** Added 16GB and 32GB options for DigitalOcean droplets.
- **Monitoring:** Improved `/srvrebuild` with 5-minute status monitoring loop.
- **Backup:** Fixed `/backup` to include ALL bot files (comprehensive backup).
- **License System:** Fixed impossible `/addtoken` (command was missing), now functional.
- **UI:** Improved Owner Menu layout.

## [v8.5] - 2024-12-28
### Added
- **CPU Monitor Button:** Directly accessible from Owner Menu.
- **New Help System:** Complete rewrite of `/help` covering all 8.x features.
### Changed
- **Branding Overhaul:** Removed `@sky` and legacy "Skypedia" references; replaced with proper Schnuffelll branding.
- **Install Domain Flow:** Replaced confusing inline query with a direct, interactive subdomain selection menu.
### Fixed
- **Broken Menus:** Resolved issues where "Install Domain" and "CPU" buttons were unresponsive or missing.
- **Initialization:** Fixed potential crashes in `start.js` due to syntax errors.

## [v8.3.3-beta] - 2024-12-28
### Added
- **Interactive Server List:** Replaced text list with inline buttons for `/panelservers`.
  - Pagination support (Next/Prev).
  - One-click access to server controls.
- **Interactive User List:** Replaced text list with inline buttons for `/panelusers`.
  - Pagination support.
  - One-click user management (Delete/Reset).
### Changed
- Refactored `panelmgmt.js` to support interactive callbacks (`pnl_servers`, `pnl_users`).
- Updated `servermgmt.js` to handle `srv_main` callback for seamless simulated info menu.

## [v8.3.2-beta] - 2024-12-28
### Added
- **Unified Panel Menu:** Added `/panel` command with a centralized inline dashboard.
### Removed
- Deleted legacy `panel.js.old` to clean up codebase.
### Changed
- Modernized Panel Management flow.

## [v8.3.1-beta] - 2024-12-28
### Added
- **Dynamic DO Management:** Implemented `/adddo`, `/deldo`, `/listdo` using `do_tokens.json`.
- **DNS Management:** Exposed DNS menus in `ownermenu`.
### Fixed
- Fixed "Ghost Menus" (hidden features) in proper inline menus.
- Fixed VPS creation using hardcoded accounts (now dynamic).
