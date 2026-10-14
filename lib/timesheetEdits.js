// Background hydration is not a user edit. Keep snapshot comparison so reverting
// an actual edit also removes the leave warning.
export function hasTimesheetEdits({ ready, userEdited, baseline, current }) {
  return Boolean(ready && userEdited && baseline !== null && current !== baseline);
}
