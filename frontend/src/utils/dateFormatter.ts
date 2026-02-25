import type { Time } from '../backend';

export function formatDate(time: Time): string {
  const milliseconds = Number(time) / 1000000;
  const date = new Date(milliseconds);
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  
  return date.toLocaleDateString('sv-SE', options);
}
