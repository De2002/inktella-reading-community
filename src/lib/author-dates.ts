import { isValid, parse } from "date-fns";

export function authorDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  for (const pattern of ["yyyy-MM-dd", "d MMMM yyyy", "MMMM d, yyyy", "MMMM d yyyy"]) {
    const date = parse(value.trim(), pattern, new Date(2000, 0, 1));
    if (isValid(date)) return date;
  }
  return null;
}

export function authorAge(birth: string | null | undefined, death: string | null | undefined, today: Date): number | null {
  const start = authorDate(birth);
  const end = death ? authorDate(death) : today;
  if (!start || !end || end < start) return null;
  let age = end.getFullYear() - start.getFullYear();
  if (end.getMonth() < start.getMonth() || (end.getMonth() === start.getMonth() && end.getDate() < start.getDate())) age--;
  return age;
}