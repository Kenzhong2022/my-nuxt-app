import type { DateString } from "./common";

export interface HourlyQuery {
  date?: DateString;
  timezone?: string;
}

export interface DailyQuery {
  startDate?: DateString;
  endDate?: DateString;
  timezone?: string;
}
