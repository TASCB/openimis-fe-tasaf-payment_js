/* eslint-disable import/prefer-default-export */

import React from 'react';

import AccountBalanceWalletIcon from '@material-ui/icons/AccountBalanceWallet';

import { FormattedMessage } from '@openimis/fe-core';

import reducer from './reducer';
import messages_en from './translations/en.json';
import {
  VerificationPendingTabLabel,
  VerificationSuccessTabLabel,
  VerificationFailedTabLabel,
  
} from './components/VerificationResultsTabLabels';
import VerificationResultsPage from './pages/VerificationResultsPage';
import AccountApprovalPage from './pages/AccountApprovalPage';
import PreAuditPage from './pages/PreAuditPage';
import PaylistListPage from './pages/PaylistListPage';
import PaylistDetailPage from './pages/PaylistDetailPage';
import ReturnFeedbackPage from './pages/ReturnFeedbackPage';
import PaymentDashboardPage from './pages/PaymentDashboardPage';
import TasafPaymentsPage from './pages/TasafPaymentsPage';
import PaymentGenerationStepper from './components/generation/PaymentGenerationStepper';
import {
  DashboardTabLabel, VerificationTabLabel, PreAuditTabLabel,
  GenerateTabLabel, PaylistsTabLabel, ReturnsTabLabel, ReportsTabLabel,
  DashboardTabPanel, VerificationTabPanel, PreAuditTabPanel,
  GenerateTabPanel, PaylistsTabPanel, ReturnsTabPanel, ReportsTabPanel,
  ChargesTabLabel, ChargesTabPanel,
} from './components/workspace/WorkspaceTabs';

import {
  TASAF_PAYMENT_TABS_LABEL_CONTRIBUTION_KEY,
  TASAF_WORKSPACE_TABS_LABEL_CONTRIBUTION_KEY,
  TASAF_WORKSPACE_TABS_PANEL_CONTRIBUTION_KEY,
  RIGHT_PAYMENT_ACCOUNT_SEARCH,
  RIGHT_APPROVE_ACCOUNTS,
  RIGHT_RUN_PRE_AUDIT,
  RIGHT_PAYLIST_SEARCH,
  RIGHT_GENERATE_PAYLIST,
  RIGHT_RETURN_FEEDBACK,
  RIGHT_DASHBOARD,
} from './constants';

const ROUTE_WORKSPACE        = 'tasafPayment/workspace';
const ROUTE_VERIFICATION     = 'tasafPayment/verificationResults';
const ROUTE_APPROVAL         = 'tasafPayment/approval';
const ROUTE_PRE_AUDIT        = 'tasafPayment/preAudit';
const ROUTE_PAYLISTS         = 'tasafPayment/paylists';
const ROUTE_PAYLIST_DETAIL   = 'tasafPayment/paylist/:paylist_uuid';
const ROUTE_BATCH_GENERATION = 'tasafPayment/batchGeneration';
const ROUTE_RETURN_FEEDBACK  = 'tasafPayment/returnFeedback';
const ROUTE_DASHBOARD        = 'tasafPayment/dashboard';

const DEFAULT_CONFIG = {
  translations: [{ key: 'en', messages: messages_en }],
  reducers: [{ key: 'tasafPayment', reducer }],
  refs: [
    { key: 'tasafPayment.route.workspace',           ref: ROUTE_WORKSPACE },
    { key: 'tasafPayment.route.verificationResults', ref: ROUTE_VERIFICATION },
    { key: 'tasafPayment.route.approval',            ref: ROUTE_APPROVAL },
    { key: 'tasafPayment.route.preAudit',            ref: ROUTE_PRE_AUDIT },
    { key: 'tasafPayment.route.paylists',            ref: ROUTE_PAYLISTS },
    { key: 'tasafPayment.route.paylistDetail',       ref: ROUTE_PAYLIST_DETAIL },
    { key: 'tasafPayment.route.batchGeneration',     ref: ROUTE_BATCH_GENERATION },
    { key: 'tasafPayment.route.returnFeedback',      ref: ROUTE_RETURN_FEEDBACK },
    { key: 'tasafPayment.route.dashboard',           ref: ROUTE_DASHBOARD },
  ],
  [TASAF_PAYMENT_TABS_LABEL_CONTRIBUTION_KEY]: [
    VerificationPendingTabLabel, VerificationSuccessTabLabel, VerificationFailedTabLabel,
  ],

  // Consolidated workspace tabs (pipeline order). Other modules can inject tabs here.
  [TASAF_WORKSPACE_TABS_LABEL_CONTRIBUTION_KEY]: [
    DashboardTabLabel, VerificationTabLabel, PreAuditTabLabel,
    GenerateTabLabel, PaylistsTabLabel, ReturnsTabLabel, ReportsTabLabel, ChargesTabLabel,
  ],
  [TASAF_WORKSPACE_TABS_PANEL_CONTRIBUTION_KEY]: [
    DashboardTabPanel, VerificationTabPanel, PreAuditTabPanel,
    GenerateTabPanel, PaylistsTabPanel, ReturnsTabPanel, ReportsTabPanel, ChargesTabPanel,
  ],

  'core.Router': [
    // Consolidated workspace (single menu entry).
    { path: ROUTE_WORKSPACE,        component: TasafPaymentsPage },
    // Standalone routes kept for deep-linking; paylist detail still needs its own URL.
    { path: ROUTE_VERIFICATION,     component: VerificationResultsPage },
    { path: ROUTE_APPROVAL,         component: AccountApprovalPage },
    { path: ROUTE_PRE_AUDIT,        component: PreAuditPage },
    { path: ROUTE_PAYLISTS,         component: PaylistListPage },
    { path: ROUTE_PAYLIST_DETAIL,   component: PaylistDetailPage },
    // Generation now uses the guided stepper (old form component retained but unrouted).
    { path: ROUTE_BATCH_GENERATION, component: PaymentGenerationStepper },
    { path: ROUTE_RETURN_FEEDBACK,  component: ReturnFeedbackPage },
    { path: ROUTE_DASHBOARD,        component: PaymentDashboardPage },
  ],
  'invoice.MainMenu': [
    {
      text: <FormattedMessage module="tasafPayment" id="menu.workspace" />,
      icon: <AccountBalanceWalletIcon />,
      route: `/${ROUTE_WORKSPACE}`,
      filter: (rights) => [
        RIGHT_DASHBOARD, RIGHT_PAYMENT_ACCOUNT_SEARCH, RIGHT_APPROVE_ACCOUNTS,
        RIGHT_RUN_PRE_AUDIT, RIGHT_GENERATE_PAYLIST, RIGHT_PAYLIST_SEARCH, RIGHT_RETURN_FEEDBACK,
      ].some((r) => rights.includes(r)),
      id: 'tasafPayment.workspace',
    },
  ],
};

export const TASAFPaymentModule = (cfg) => ({ ...DEFAULT_CONFIG, ...cfg });
