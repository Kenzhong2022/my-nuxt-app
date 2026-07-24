import type { HourlyVisits, DailyVisits, DateString } from "./common";

export interface HourlyResponse {
  date: DateString;
  hourlyVisits: HourlyVisits;
  total: number;
}

export interface DailyResponse {
  startDate: DateString;
  endDate: DateString;
  dates: DateString[];
  dailyVisits: number[];
  total: number;
}
