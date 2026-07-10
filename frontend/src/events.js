export const FINANCE_DATA_CHANGED = "finance-data-changed";

export const notifyFinanceDataChanged = () => {
  window.dispatchEvent(new Event(FINANCE_DATA_CHANGED));
};



