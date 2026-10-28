# Shinka Development Work Management Hub — Architecture

## Hosting and storage
- Static, browser-only web application suitable for GitHub Pages.
- IndexedDB is the local primary store. GitHub stores application source only, not user records.
- JSON backup export/import uses a versioned schema and validates content and relationships before writing.
- Data does not sync between browsers or devices. Site-data clearing, browser profile deletion, or storage eviction can cause data loss.

## Data model
- Project: id, name, description, archive flag, created/updated timestamps.
- Task: id, external ticketId, title, description, type, project link, priority, assigning consultant, task status, code status, instance status, notes, create/update/completion/delete timestamps.
- Activity: id, taskId, event type/title/details, metadata, timestamp.
- TimeLog: id, taskId, work type, note, manual/timer method, start/end timestamps, duration seconds, create/delete timestamps.
- Settings: key/value, including backup reminder preference and active timer state.

## Status vocabulary
- Task status: Open, In Progress, Blocked, Completed. Completion is manual and reversible using Reopen; reopening chooses Open, In Progress, or Blocked.
- Code status: Not Started, In Local, Pushed to Git.
- Instance status: Not Deployed, TEST, UAT, Production.
- These three status axes are independent; environment changes do not auto-complete tasks.

## Time tracking
- Supports manual duration entries and a single global start/pause/resume/stop timer.
- Timer start/pause/resume/stop events are recorded in task activity.
- Elapsed time is timestamp-derived and timer state is persisted locally.
- Long recovered gaps require user review; browser timers cannot guarantee actual work time.
- Timer sessions currently save as Development work type with a generic note; extend the timer UI to select work type and add a note in a later iteration.

## Safety rules
- Task deletion is soft deletion; related activity and time logs are preserved in local records and backups.
- Time logs cannot be added to Completed tasks; reopen the task first.
- Import checks schema version, collection shapes, enum values, unique task IDs, and parent relationships. Merge/replace choices require user interaction.
- Never claim browser-only storage is a substitute for independent backups.
- Avoid putting real company confidential information in the public GitHub repo; all task records remain locally in the browser.
