import assert from "node:assert/strict";
import test from "node:test";

import { readRouteBundle } from "./helpers/routeSource.js";

const meSource = readRouteBundle("app/(protected)/(main-tabs)/me.js");

test("profile dashboard keeps identity and actions compact", () => {
  assert.match(meSource, /styles\.profileIdentityRow/);
  assert.match(meSource, /\{account\.name\}/);
  assert.match(meSource, /label="Edit"/);
  assert.match(meSource, /<IconButton[\s\S]*?icon="settings"[\s\S]*?label="Open settings"/);
  assert.match(meSource, /accessibilityLabel="Edit my profile"/);
  assert.doesNotMatch(meSource, />My Profile<\/Text>/);
});

test("availability form expands only when requested", () => {
  assert.match(meSource, /const \[noteComposerOpen, setNoteComposerOpen\] = useState\(false\)/);
  assert.match(meSource, /\{noteComposerOpen \? <View/);
  assert.match(meSource, /Tell the office when you cannot be booked/);
});

test("availability actions use the shared Apple button hierarchy", () => {
  assert.match(
    meSource,
    /<AppButton[\s\S]*?label=\{noteComposerOpen \? "Close" : "Add"\}[\s\S]*?variant="secondary"[\s\S]*?selected=\{noteComposerOpen\}/
  );
  assert.match(
    meSource,
    /<AppButton[\s\S]*?label="History"[\s\S]*?variant="ghost"/
  );
  assert.doesNotMatch(meSource, /styles\.noteHistoryButton/);
  assert.doesNotMatch(meSource, /styles\.historyTextButton/);
});

test("holiday action uses shared glass and negative balance tone", () => {
  assert.match(
    meSource,
    /<AppButton[\s\S]*?label="Manage Holidays"[\s\S]*?variant="secondary"/
  );
  assert.match(meSource, /getBalanceStatusTone\(holidayRemaining\)/);
  assert.match(meSource, /holidayBalanceTone/);
  assert.doesNotMatch(meSource, /styles\.sectionAction\b/);
});

test("personal summaries use compact direct actions", () => {
  assert.match(meSource, /style=\{styles\.summaryLink\}/);
  assert.match(meSource, /style=\{styles\.actionGrid\}/);
  assert.match(meSource, /name="file-text"/);
  assert.doesNotMatch(meSource, /name="receipt"/);
  assert.match(meSource, /styles\.holidayProgressFill/);
  assert.match(meSource, />Allowance<\/Text>/);
  assert.doesNotMatch(meSource, /Allowance \(\{currentYear\}\)/);
  assert.match(meSource, /statRow:\s*\{[\s\S]*?flex:\s*1,[\s\S]*?minWidth:\s*0,/);
  assert.match(meSource, /styles\.summaryChevron/);
  assert.doesNotMatch(meSource, /\{timesheetStats\.pending\} pending/);
  assert.match(meSource, /calculateRemainingHolidayAllowance\(totalAllowance, used, booked\)/);
  assert.match(meSource, />Booked<\/Text>/);
  assert.match(meSource, /fmtHalf\(holidayBookedDays\)/);
});

test("nested expense cards use a smaller concentric radius", () => {
  assert.match(
    meSource,
    /sectionPanel:\s*\{[\s\S]*?borderRadius:\s*t\.componentRadius\.card/
  );
  assert.match(
    meSource,
    /actionTile:\s*\{[\s\S]*?borderRadius:\s*getConcentricRadius\(t\.componentRadius\.card, t\.spacing\.sm \+ 1\)/
  );
});
