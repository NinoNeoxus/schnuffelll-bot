# Changelog

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
