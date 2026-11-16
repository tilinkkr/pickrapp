/** DEMO customer rating until drivers can rate trips: 5.00 for new customers, 4.80 once trips are paid. */
export function demoRating(paidTrips: number) {
  return paidTrips > 0 ? 4.8 : 5;
}
