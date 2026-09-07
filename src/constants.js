// Permission codes — must match backend apps.py DEFAULT_CONFIG
// Entity 20: PaymentAccount CRUD
export const RIGHT_PAYMENT_ACCOUNT_SEARCH = 270001;
export const RIGHT_PAYMENT_ACCOUNT_CREATE = 270002;
export const RIGHT_PAYMENT_ACCOUNT_UPDATE = 270003;
export const RIGHT_PAYMENT_ACCOUNT_DELETE = 270004;
// Entity 21: Verification workflow
export const RIGHT_RUN_VERIFICATION  = 270101;
export const RIGHT_APPROVE_ACCOUNTS  = 270102;
// Entity 22: Pre-audit. Viewing is separate from running so an auditor can read the
// eligibility gate without being able to operate it.
export const RIGHT_PRE_AUDIT_SEARCH  = 270202;
export const RIGHT_RUN_PRE_AUDIT     = 270201;
// Entity 23: Paylist
export const RIGHT_PAYLIST_SEARCH    = 270301;
export const RIGHT_GENERATE_PAYLIST  = 270302;
export const RIGHT_APPROVE_PAYLIST   = 270303;
export const RIGHT_SUBMIT_PAYLIST    = 270304;
// Entity 24: Return feedback
export const RIGHT_RETURN_FEEDBACK   = 270401;
// Tariff table. Editing a fee table must not ride on a returns-processing right.
export const RIGHT_WITHDRAWAL_CHARGE_SEARCH = 270701;
export const RIGHT_WITHDRAWAL_CHARGE_MANAGE = 270702;

export const RIGHT_REPORTS           = 270801;
// Entity 25: Dashboard
export const RIGHT_DASHBOARD         = 270501;
// Entity 26: MUSE verification records
export const RIGHT_MUSE_RECORDS      = 270601;

// case_management's right and route ref. A failed account is corrected there, so the
// Failed sub-tab drills across; both are guarded, since that module may not be installed.
export const RIGHT_ACCOUNT_CORRECTION = 290205;
export const ROUTE_REF_ACCOUNT_CORRECTION = 'caseManagement.route.accountCorrection';

export const ROUTE_REF_GROUP = 'individual.route.group';

export const MODULE_NAME = 'tasafPayment';

// Default width for every dialog in this module -- one edit, not one per dialog.
export const DIALOG_MAX_WIDTH = 'md';

export const DEFAULT_PAGE_SIZE = 10;
export const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];
export const DEFAULT_DEBOUNCE_TIME = 500;
export const CONTAINS_LOOKUP = 'Icontains';
export const EMPTY_STRING = '';

// Verification status enum names — align with GraphQL/openIMIS conventions
export const VERIFICATION_STATUS = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  FAILED: 'FAILED',
  MANUAL: 'MANUAL',
  PENDING_MUSE: 'PENDING_MUSE',
};

export const VERIFICATION_STATUS_LIST = [
  VERIFICATION_STATUS.PENDING,
  VERIFICATION_STATUS.VERIFIED,
  VERIFICATION_STATUS.FAILED,
  VERIFICATION_STATUS.MANUAL,
  VERIFICATION_STATUS.PENDING_MUSE,
];

// Backend persistence remains integer-based; keep explicit maps for compatibility.
export const VERIFICATION_STATUS_CODE = {
  [VERIFICATION_STATUS.PENDING]: 0,
  [VERIFICATION_STATUS.VERIFIED]: 1,
  [VERIFICATION_STATUS.FAILED]: 2,
  [VERIFICATION_STATUS.MANUAL]: 3,
  [VERIFICATION_STATUS.PENDING_MUSE]: 4,
};

export const VERIFICATION_STATUS_BY_CODE = Object.fromEntries(
  Object.entries(VERIFICATION_STATUS_CODE).map(([status, code]) => [code, status]),
);

export const FSP_TYPE = {
  BANK:   'BANK',
  MOBILE: 'MOBILE',
};

export const FSP_TYPE_LIST = [FSP_TYPE.BANK, FSP_TYPE.MOBILE];

export const BATCH_TYPE = {
  BANK:  'BANK',
  MNO:   'MNO',
  MIXED: 'MIXED',
};

export const BATCH_TYPE_LIST = [BATCH_TYPE.BANK, BATCH_TYPE.MNO, BATCH_TYPE.MIXED];

// Mirrors tasaf_payment.models.PaymentDestination.
export const DESTINATION = {
  MUSE: 'MUSE',
  GEPG: 'GEPG',
};

export const DESTINATION_LIST = [DESTINATION.MUSE, DESTINATION.GEPG];

// payroll.models.PayrollStatus -- only approved payrolls may be disbursed.
export const PAYROLL_STATUS_APPROVED = 'APPROVE_FOR_PAYMENT';

export const PAYLIST_STATUS = {
  DRAFT:            'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED:         'APPROVED',
  SUBMITTED:        'SUBMITTED',
  CLOSED:           'CLOSED',
};

export const PRE_AUDIT_STATUS = {
  PENDING: 'PENDING',
  PASSED:  'PASSED',
  FAILED:  'FAILED',
};

export const ACTIVE_CHECK_STATUS = {
  PENDING:  'PENDING',
  ACTIVE:   'ACTIVE',
  INACTIVE: 'INACTIVE',
};

export const MUSE_VERIFICATION_RESULT = {
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  MANUAL: 'MANUAL',
};

export const RETURN_FEEDBACK_TYPE = {
  UNAPPLIED: 'UNAPPLIED',
  RETURNED:  'RETURNED',
  PARTIAL:   'PARTIAL',
};

// Contribution keys
export const TASAF_PAYMENT_TABS_LABEL_CONTRIBUTION_KEY = 'tasafPayment.TabPanel.label';
export const TASAF_PAYMENT_TABS_PANEL_CONTRIBUTION_KEY = 'tasafPayment.TabPanel.panel';

export const TAB_PENDING = 'pending';
export const TAB_SUCCESS = 'success';
export const TAB_FAILED = 'failed';

export const TASAF_WORKSPACE_TABS_LABEL_CONTRIBUTION_KEY = 'tasafPayment.WorkspaceTabPanel.label';
export const TASAF_WORKSPACE_TABS_PANEL_CONTRIBUTION_KEY = 'tasafPayment.WorkspaceTabPanel.panel';

export const WS_TAB_DASHBOARD    = 'dashboard';
export const WS_TAB_VERIFICATION = 'verification';
export const WS_TAB_APPROVAL     = 'approval';
export const WS_TAB_PRE_AUDIT    = 'preAudit';
export const WS_TAB_GENERATE     = 'generate';
export const WS_TAB_PAYLISTS     = 'paylists';
export const WS_TAB_RETURNS      = 'returns';
export const WS_TAB_CHARGES      = 'charges';
export const WS_TAB_REPORTS      = 'reports';
