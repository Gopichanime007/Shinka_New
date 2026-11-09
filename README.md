# Shinka · Development Work Management Hub

A browser-based personal development task tracker hosted with GitHub Pages.

## Initial architecture

- Static client-side web app
- IndexedDB for local structured data
- Versioned JSON export/import for backups
- Main tasks with activity history and linked time logs
- Independent task, code, and instance statuses
- Start/stop timer and manual time entry

## Status vocabulary

- Task: Open, In Progress, Blocked, Completed (manual completion and reopen)
- Code: Not Started, In Local, Pushed to Git
- Instance: Not Deployed, TEST, UAT, Production

## Data safety

App records live in the browser's IndexedDB and are not stored in this GitHub repository. Export JSON backups regularly and keep them in an approved location. Clearing site data may remove browser records.

## Development

The app is being built incrementally. See the repository's current branch and commit history for implementation status.


## Source structure

This is currently a static client-side application. It uses browser IndexedDB for local data storage; it does not have a server-side API/database backend.

- `index.html`: page markup and asset references
- `assets/css/app.css`: application styles and theme rules
- `assets/js/app.js`: application logic (kept as one script for now because the current implementation shares private state inside one closure; splitting it into independent modules safely requires a follow-up refactor to explicit shared state and module interfaces)
