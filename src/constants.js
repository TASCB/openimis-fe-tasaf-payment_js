// Permission codes — must match backend apps.py DEFAULT_CONFIG
// Entity 20: PaymentAccount CRUD
export const RIGHT_PAYMENT_ACCOUNT_SEARCH = 152001;
export const RIGHT_PAYMENT_ACCOUNT_CREATE = 152002;
export const RIGHT_PAYMENT_ACCOUNT_UPDATE = 152003;
export const RIGHT_PAYMENT_ACCOUNT_DELETE = 152004;
// Entity 21: Verification workflow
export const RIGHT_RUN_VERIFICATION  = 152101;
export const RIGHT_APPROVE_ACCOUNTS  = 152102;
export const RIGHT_RESUBMIT_FAILED   = 152103;
// Entity 22: Pre-audit
export const RIGHT_RUN_PRE_AUDIT     = 152201;
// Entity 23: Paylist
export const RIGHT_PAYLIST_SEARCH    = 152301;
export const RIGHT_GENERATE_PAYLIST  = 152302;
export const RIGHT_APPROVE_PAYLIST   = 152303;
export const RIGHT_SUBMIT_PAYLIST    = 152304;
// Entity 24: Return feedback
export const RIGHT_RETURN_FEEDBACK   = 152401;
// Entity 25: Dashboard
export const RIGHT_DASHBOARD         = 152501;
// Entity 26: MUSE verification records
export const RIGHT_MUSE_RECORDS      = 152601;

export const MODULE_NAME = 'tasafPayment';

export const DEFAULT_PAGE_SIZE = 10;
export const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];
export const DEFAULT_DEBOUNCE_TIME = 500;
export const CONTAINS_LOOKUP = 'Icontains';
export const EMPTY_STRING = '';

// Verification status integers — match backend VerificationStatus IntegerChoices
export const VERIFICATION_STATUS = {
  PENDING:      0,
  VERIFIED:     1,
  FAILED:       2,
  MANUAL:       3,
  PENDING_MUSE: 4,  // sent to MUSE, awaiting result
};

export const VERIFICATION_STATUS_LIST = [
  VERIFICATION_STATUS.PENDING,
  VERIFICATION_STATUS.VERIFIED,
  VERIFICATION_STATUS.FAILED,
  VERIFICATION_STATUS.MANUAL,
  VERIFICATION_STATUS.PENDING_MUSE,
];

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

// Verification Results tab values — exported so tab label contributions can import them
export const TAB_PASSED = 'passed';
export const TAB_FAILED = 'failed';
