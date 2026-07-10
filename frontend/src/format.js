export const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

export const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(value) || 0);

export const formatTrend = (trend) => {
  if (!trend || trend.percent === null || trend.percent === undefined) return "New";
  const prefix = trend.percent > 0 ? "+" : "";
  return `${prefix}${trend.percent}%`;
};

export const estimateLoanMonths = (principal, annualRate, emi) => {
  const p = Number(principal) || 0;
  const r = (Number(annualRate) || 0) / 100 / 12;
  const e = Number(emi) || 0;
  if (p <= 0 || e <= 0) return null;
  if (r <= 0) return Math.ceil(p / e);
  if (e <= p * r) return null;
  return Math.ceil(-Math.log(1 - (p * r) / e) / Math.log(1 + r));
};



