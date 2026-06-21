export type CalendarStateSource = {
  status: string;
  operationalState?: string | null;
};

export function calendarDisplayState(item: CalendarStateSource) {
  return item.operationalState ?? item.status;
}
