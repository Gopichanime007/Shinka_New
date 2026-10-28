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
