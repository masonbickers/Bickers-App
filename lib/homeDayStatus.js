export const HOME_DAY_ICONS = {
  'Yard Based': 'home', 'Off': 'moon', 'Holiday (Unpaid)': 'alert-triangle',
  'Holiday (Paid)': 'sun', 'Bank Holiday': 'briefcase',
};
export function getHomeDayLabel(holidayInfo, date) {
  if (holidayInfo?.kind === 'personal') return holidayInfo.pay === 'Unpaid' ? 'Holiday (Unpaid)' : 'Holiday (Paid)';
  if (holidayInfo?.kind === 'bank') return 'Bank Holiday';
  return date && [0, 6].includes(date.getDay()) ? 'Off' : 'Yard Based';
}
