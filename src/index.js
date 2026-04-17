/* eslint-disable import/prefer-default-export */

import React from 'react';

import AssignmentTurnedInIcon from '@material-ui/icons/AssignmentTurnedIn';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import SecurityIcon from '@material-ui/icons/Security';
import ListAltIcon from '@material-ui/icons/ListAlt';
import PlaylistAddIcon from '@material-ui/icons/PlaylistAdd';
import ReplyAllIcon from '@material-ui/icons/ReplyAll';
import DashboardIcon from '@material-ui/icons/Dashboard';

import { FormattedMessage } from '@openimis/fe-core';

import reducer from './reducer';
import messages_en from './translations/en.json';
import {
  VerificationPassedTabLabel,
  VerificationFailedTabLabel,
} from './components/VerificationResultsTabLabels';
import VerificationResultsPage from './pages/VerificationResultsPage';
import AccountApprovalPage from './pages/AccountApprovalPage';
import PreAuditPage from './pages/PreAuditPage';
import PaylistListPage from './pages/PaylistListPage';
import PaylistDetailPage from './pages/PaylistDetailPage';
import BatchGenerationPage from './pages/BatchGenerationPage';
import ReturnFeedbackPage from './pages/ReturnFeedbackPage';
import PaymentDashboardPage from './pages/PaymentDashboardPage';

import {
  TASAF_PAYMENT_TABS_LABEL_CONTRIBUTION_KEY,
  RIGHT_PAYMENT_ACCOUNT_SEARCH,
  RIGHT_APPROVE_ACCOUNTS,
  RIGHT_RUN_PRE_AUDIT,
  RIGHT_PAYLIST_SEARCH,
  RIGHT_GENERATE_PAYLIST,
  RIGHT_RETURN_FEEDBACK,
  RIGHT_DASHBOARD,
} from './constants';

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
    { key: 'tasafPayment.route.verificationResults', ref: ROUTE_VERIFICATION },
    { key: 'tasafPayment.route.approval',            ref: ROUTE_APPROVAL },
    { key: 'tasafPayment.route.preAudit',            ref: ROUTE_PRE_AUDIT },
    { key: 'tasafPayment.route.paylists',            ref: ROUTE_PAYLISTS },
    { key: 'tasafPayment.route.paylistDetail',       ref: ROUTE_PAYLIST_DETAIL },
    { key: 'tasafPayment.route.batchGeneration',     ref: ROUTE_BATCH_GENERATION },
    { key: 'tasafPayment.route.returnFeedback',      ref: ROUTE_RETURN_FEEDBACK },
    { key: 'tasafPayment.route.dashboard',           ref: ROUTE_DASHBOARD },
  ],
  // Tab label contributions — other modules can add tabs to VerificationResultsPage
  // by contributing to this key in their own index.js DEFAULT_CONFIG
  [TASAF_PAYMENT_TABS_LABEL_CONTRIBUTION_KEY]: [VerificationPassedTabLabel, VerificationFailedTabLabel],

  'core.Router': [
    { path: ROUTE_VERIFICATION,     component: VerificationResultsPage },
    { path: ROUTE_APPROVAL,         component: AccountApprovalPage },
    { path: ROUTE_PRE_AUDIT,        component: PreAuditPage },
    { path: ROUTE_PAYLISTS,         component: PaylistListPage },
    { path: ROUTE_PAYLIST_DETAIL,   component: PaylistDetailPage },
    { path: ROUTE_BATCH_GENERATION, component: BatchGenerationPage },
    { path: ROUTE_RETURN_FEEDBACK,  component: ReturnFeedbackPage },
    { path: ROUTE_DASHBOARD,        component: PaymentDashboardPage },
  ],
  // invoice.MainMenu is the correct slot for Legal & Finance menu items
  'invoice.MainMenu': [
    {
      text: <FormattedMessage module="tasafPayment" id="menu.verificationResults" />,
      icon: <AssignmentTurnedInIcon />,
      route: `/${ROUTE_VERIFICATION}`,
      filter: (rights) => rights.includes(RIGHT_PAYMENT_ACCOUNT_SEARCH),
      id: 'tasafPayment.verificationResults',
    },
    {
      text: <FormattedMessage module="tasafPayment" id="menu.approval" />,
      icon: <CheckCircleIcon />,
      route: `/${ROUTE_APPROVAL}`,
      filter: (rights) => rights.includes(RIGHT_APPROVE_ACCOUNTS),
      id: 'tasafPayment.approval',
    },
    {
      text: <FormattedMessage module="tasafPayment" id="menu.preAudit" />,
      icon: <SecurityIcon />,
      route: `/${ROUTE_PRE_AUDIT}`,
      filter: (rights) => rights.includes(RIGHT_RUN_PRE_AUDIT),
      id: 'tasafPayment.preAudit',
    },
    {
      text: <FormattedMessage module="tasafPayment" id="menu.paylists" />,
      icon: <ListAltIcon />,
      route: `/${ROUTE_PAYLISTS}`,
      filter: (rights) => rights.includes(RIGHT_PAYLIST_SEARCH),
      id: 'tasafPayment.paylists',
    },
    {
      text: <FormattedMessage module="tasafPayment" id="menu.batchGeneration" />,
      icon: <PlaylistAddIcon />,
      route: `/${ROUTE_BATCH_GENERATION}`,
      filter: (rights) => rights.includes(RIGHT_GENERATE_PAYLIST),
      id: 'tasafPayment.batchGeneration',
    },
    {
      text: <FormattedMessage module="tasafPayment" id="menu.returnFeedback" />,
      icon: <ReplyAllIcon />,
      route: `/${ROUTE_RETURN_FEEDBACK}`,
      filter: (rights) => rights.includes(RIGHT_RETURN_FEEDBACK),
      id: 'tasafPayment.returnFeedback',
    },
    {
      text: <FormattedMessage module="tasafPayment" id="menu.dashboard" />,
      icon: <DashboardIcon />,
      route: `/${ROUTE_DASHBOARD}`,
      filter: (rights) => rights.includes(RIGHT_DASHBOARD),
      id: 'tasafPayment.dashboard',
    },
  ],
};

export const TASAFPaymentModule = (cfg) => ({ ...DEFAULT_CONFIG, ...cfg });
