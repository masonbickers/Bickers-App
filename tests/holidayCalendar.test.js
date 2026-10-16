import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHolidayCalendar} from '../lib/holidayCalendar.js';
const payload = dates => ({'england-and-wales':{events:dates.map(date=>({date}))}});
test('bank holidays are limited to the calculation year and deduplicated',()=>{
  assert.deepEqual([...parseHolidayCalendar(payload(['2025-12-25','2026-01-01','2026-01-01','2026-12-25']),2026)],['2026-01-01','2026-12-25']);
});
test('missing or invalid calendar data cannot silently count bank holidays as work days',()=>{
  for(const data of [{},payload([]),payload(['2025-12-25']),payload(['2026-02-31']),payload(['broken'])])assert.throws(()=>parseHolidayCalendar(data,2026));
});
