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

The application is a static client-side GitHub Pages app. It does not currently have a server-side backend; user data is stored locally in the browser with IndexedDB.

- `index.html`: page structure and asset loading only
- `assets/css/app.css`: application styles and theme rules
- `assets/js/core.js`: shared constants, utilities, IndexedDB access, and core data operations
- `assets/js/tasks.js`: task-related helpers, forms, history grouping, and task presentation
- `assets/js/views.js`: page rendering and screen composition
- `assets/js/time-tracker.js`: timer controls and task/time reports
- `assets/js/timesheets.js`: timesheet entry autosave and exports
- `assets/js/backup.js`: backup validation/import/export, workspace actions, event handling, and app startup

The JavaScript files are loaded as ordered classic scripts. Keep the order in `index.html` intact because later files use shared declarations from earlier files.
