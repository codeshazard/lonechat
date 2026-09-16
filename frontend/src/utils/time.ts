/**
 * Format a Date object into a readable 12-hour or 24-hour HH:MM time string.
 */
export function formatTime(date: Date = new Date()): string {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
