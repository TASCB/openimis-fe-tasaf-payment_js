import { buildPaylistHeader, formatCurrency } from '@openimis/fe-payroll';

const PAYEE_COLUMNS = [
  { header: 'NAMBA YA MLENGWA', width: 45, value: (row) => row.hhid },
  { header: 'MWAKILISHI WA KAYA', width: 46, value: (row) => row.representative },
  { header: 'BENKI/ MTANDAO', width: 30, value: (row) => row.fsp },
  { header: 'AKAUNTI', width: 27, value: (row) => row.account },
  {
    header: 'KIASI', width: 26, halign: 'right', value: (row) => formatCurrency(row.amount),
  },
];

const PAYMENT_LABELS = {
  base_amount: 'Ruzuku isiyo na Masharti',
  young_child_amount: 'Malipo ya Watoto < 18',
  disability_amount: 'Malipo ya Ulemavu',
  primary_amount: 'Malipo ya Watoto Shule ya Msingi',
  secondary_amount: 'Malipo ya Sekondari',
  withdrawal_charge: 'Gharama za Kutoa Fedha',
  other: 'Marekebisho Mengine',
};

const DEDUCTION_LABELS = {
  education_penalty: 'Adhabu ya kutotimiza masharti ya Elimu',
  health_penalty: 'Adhabu ya kutotimiza masharti ya Afya',
  overpayment: 'Malipo yaliyozidishwa Kipindi cha nyuma',
  household_cap: 'Punguzo la Kiwango cha Juu cha Kaya',
  other: 'Marekebisho Mengine',
};

const summaryRows = (entries = [], labels) => {
  const order = Object.keys(labels);
  const rank = (key) => (order.includes(key) ? order.indexOf(key) : order.length);
  return [...entries]
    .sort((a, b) => rank(a.key) - rank(b.key))
    .map((entry) => ({ label: labels[entry.key] || entry.key, amount: entry.amount }));
};

export default function buildPaylistPdfPayload(paylistExport) {
  const rows = paylistExport?.pdfRows || [];
  const breakdown = paylistExport?.pdfBreakdown;
  const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  return {
    ...buildPaylistHeader(paylistExport?.payroll),
    summaryText: `Jumla ya Walengwa: ${rows.length} | Jumla ya Fedha: ${formatCurrency(total)}`,
    items: rows,
    columns: PAYEE_COLUMNS,
    breakdownSummary: breakdown ? {
      paymentLeft: summaryRows(breakdown.payments, PAYMENT_LABELS),
      deductionRight: summaryRows(breakdown.deductions, DEDUCTION_LABELS),
      paymentTotalLabel: 'Jumla Ndogo ya Dhana ya Malipo',
      deductionTotalLabel: 'Jumla Ndogo ya Dhana ya Makato',
      grandTotalLabel: 'JUMLA YA MALIPO (KIASI)',
    } : null,
  };
}
