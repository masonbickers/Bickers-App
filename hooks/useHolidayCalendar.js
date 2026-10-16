import { useCallback, useEffect, useState } from 'react';
import { parseHolidayCalendar } from '../lib/holidayCalendar';

/** Shared by the two leave summaries so neither calculates with a missing calendar. */
export function useHolidayCalendar(year) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(() => ({year, revision:-1, dates:new Set(), error:null}));
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    (async () => {
      try {
        const response = await fetch('https://www.gov.uk/bank-holidays.json', {signal:controller.signal, cache:'no-store'});
        if (!response.ok) throw new Error('Bank holiday calendar unavailable.');
        const dates = parseHolidayCalendar(await response.json(), year);
        if (active) setState({year, revision, dates, error:null});
      } catch (error) {
        if (active && error?.name !== 'AbortError') setState({year, revision, dates:new Set(), error});
      }
    })();
    return () => { active = false; controller.abort(); };
  }, [year, revision]);
  const current = state.year === year && state.revision === revision;
  const ready = current && !state.error && state.dates.size > 0;
  const isBankHoliday = useCallback(date => {
    if (!date) return false;
    const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    return state.dates.has(key);
  }, [state.dates]);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  return {dates:state.dates, ready, error:current ? state.error : null, isBankHoliday, refresh};
}
