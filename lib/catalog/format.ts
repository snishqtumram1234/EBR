/** The design's price format: "₹14,999" (whole rupees, Indian grouping). Display only. */
export function formatRupees(paise: number): string {
  return "₹" + Math.round(paise / 100).toLocaleString("en-IN");
}
