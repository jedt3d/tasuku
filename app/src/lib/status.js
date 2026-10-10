// Every status a Task can have, in the order the Overview lists them.
export const STATUSES = ['open', 'in_progress', 'resolved', 'done', 'cancelled', 'transferred'];
// A Task in one of these is a record nobody changes: it is no longer unfinished (CONTEXT.md).
// The database has the last word (`private.is_unfinished`).
export const FINAL = ['done', 'cancelled', 'transferred'];
