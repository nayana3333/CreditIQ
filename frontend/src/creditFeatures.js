export const FEATURE_LABELS = {
  checking_status: "Account Balance",
  duration: "Loan Duration",
  credit_history: "Credit History",
  purpose: "Loan Purpose",
  credit_amount: "Loan Amount",
  savings_status: "Savings Balance",
  employment: "Employment Duration",
  installment_rate: "Installment Rate",
  personal_status: "Personal Status",
  other_parties: "Co-applicant",
  residence_since: "Years at Residence",
  property_magnitude: "Property Owned",
  age: "Applicant Age",
  other_payment_plans: "Other Loan Plans",
  housing: "Housing Type",
  existing_credits: "Existing Credits",
  job: "Job Type",
  num_dependents: "Dependents",
  own_telephone: "Has Telephone",
  foreign_worker: "Foreign Worker",
};

export const VALUE_LABELS = {
  checking_status: { A11: "Below 0 DM", A12: "0-200 DM", A13: "Above 200 DM", A14: "No account" },
  credit_history: { A30: "No credits", A31: "All paid", A32: "Existing paid", A33: "Delayed previously", A34: "Critical/other" },
  purpose: { A40: "Car", A41: "Furniture", A42: "Radio/TV", A43: "Appliance", A44: "Repairs", A45: "Education", A49: "Business", A410: "Other" },
  savings_status: { A61: "Under 100 DM", A62: "100-500 DM", A63: "500-1000 DM", A64: "Over 1000 DM", A65: "Unknown" },
  employment: { A71: "Unemployed", A72: "Under 1 year", A73: "1-4 years", A74: "4-7 years", A75: "Over 7 years" },
  personal_status: { A91: "Male single", A92: "Female divorced", A93: "Male married", A94: "Male divorced" },
  other_parties: { A101: "None", A102: "Co-applicant", A103: "Guarantor" },
  property_magnitude: { A121: "Real estate", A122: "Building society", A123: "Car", A124: "No property" },
  other_payment_plans: { A141: "Bank", A142: "Stores", A143: "None" },
  housing: { A151: "Rent", A152: "Own", A153: "Free" },
  job: { A171: "Unskilled nonresident", A172: "Unskilled resident", A173: "Skilled", A174: "Highly skilled" },
  own_telephone: { A191: "None", A192: "Yes" },
  foreign_worker: { A201: "Yes", A202: "No" },
};

export const DEFAULT_LOAN_INPUT = {
  checking_status: "A14",
  duration: 12,
  credit_history: "A32",
  purpose: "A40",
  credit_amount: 3000,
  savings_status: "A65",
  employment: "A73",
  installment_rate: 2,
  personal_status: "A91",
  other_parties: "A101",
  residence_since: 2,
  property_magnitude: "A123",
  age: 35,
  other_payment_plans: "A143",
  housing: "A152",
  existing_credits: 1,
  job: "A173",
  num_dependents: 1,
  own_telephone: "A191",
  foreign_worker: "A201",
};

export const optionSets = Object.fromEntries(Object.entries(VALUE_LABELS).map(([key, labels]) => [key, Object.keys(labels)]));

export const displayValue = (field, value) => VALUE_LABELS[field]?.[value] || value;
export const percent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;
export const money = (value) => `â‚¹${Number(value || 0).toLocaleString("en-IN")}`;



