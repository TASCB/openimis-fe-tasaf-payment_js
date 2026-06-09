/**
 * Consolidated "TASAF Payments" workspace — tab labels + panels.
 *
 * These register under the WORKSPACE contribution keys (distinct from the
 * VerificationResults internal passed/failed tabs) and compose the existing
 * page components as tab bodies. Nothing in those pages is rewritten, so the
 * consolidation cannot regress existing behaviour.
 *
 * Tab labels receive { onChange, tabStyle, isSelected, modulesManager, rights }
 * and panels receive { value, rights } — same contract as payroll/PayrollTab.
 */
import React from 'react';
import { Tab } from '@material-ui/core';
import { PublishedComponent, useTranslations } from '@openimis/fe-core';

import {
  MODULE_NAME,
  WS_TAB_DASHBOARD,
  WS_TAB_VERIFICATION,
  WS_TAB_PRE_AUDIT,
  WS_TAB_GENERATE,
  WS_TAB_PAYLISTS,
  WS_TAB_RETURNS,
  RIGHT_DASHBOARD,
  RIGHT_PAYMENT_ACCOUNT_SEARCH,
  RIGHT_RUN_PRE_AUDIT,
  RIGHT_GENERATE_PAYLIST,
  RIGHT_PAYLIST_SEARCH,
  RIGHT_RETURN_FEEDBACK,
} from '../../constants';

import PaymentDashboardPage from '../../pages/PaymentDashboardPage';
import VerificationResultsPage from '../../pages/VerificationResultsPage';
import PreAuditPage from '../../pages/PreAuditPage';
import PaylistListPage from '../../pages/PaylistListPage';
import ReturnFeedbackPage from '../../pages/ReturnFeedbackPage';
import PaymentGenerationStepper from '../generation/PaymentGenerationStepper';

const hasRight = (rights, right) => !right || (rights ?? []).includes(right);

// ── Tab label factory ─────────────────────────────────────────────────────
const makeTabLabel = (tabValue, messageId, right) => function WorkspaceTabLabel({
  onChange, tabStyle, isSelected, modulesManager, rights,
}) {
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  if (!hasRight(rights, right)) return null;
  return (
    <Tab
      onChange={onChange}
      className={tabStyle(tabValue)}
      selected={isSelected(tabValue)}
      value={tabValue}
      label={formatMessage(messageId)}
    />
  );
};

// ── Tab panel factory ─────────────────────────────────────────────────────
const makeTabPanel = (tabValue, right, PageComponent) => function WorkspaceTabPanel({
  value, rights,
}) {
  return (
    <PublishedComponent
      pubRef="policyHolder.TabPanel"
      module={MODULE_NAME}
      index={tabValue}
      value={value}
    >
      {hasRight(rights, right) && <PageComponent />}
    </PublishedComponent>
  );
};

export const DashboardTabLabel    = makeTabLabel(WS_TAB_DASHBOARD,    'workspace.tab.dashboard',    RIGHT_DASHBOARD);
export const VerificationTabLabel = makeTabLabel(WS_TAB_VERIFICATION, 'workspace.tab.verification', RIGHT_PAYMENT_ACCOUNT_SEARCH);
export const PreAuditTabLabel     = makeTabLabel(WS_TAB_PRE_AUDIT,    'workspace.tab.preAudit',     RIGHT_RUN_PRE_AUDIT);
export const GenerateTabLabel     = makeTabLabel(WS_TAB_GENERATE,     'workspace.tab.generate',     RIGHT_GENERATE_PAYLIST);
export const PaylistsTabLabel     = makeTabLabel(WS_TAB_PAYLISTS,     'workspace.tab.paylists',     RIGHT_PAYLIST_SEARCH);
export const ReturnsTabLabel      = makeTabLabel(WS_TAB_RETURNS,      'workspace.tab.returns',      RIGHT_RETURN_FEEDBACK);

export const DashboardTabPanel    = makeTabPanel(WS_TAB_DASHBOARD,    RIGHT_DASHBOARD,              PaymentDashboardPage);
export const VerificationTabPanel = makeTabPanel(WS_TAB_VERIFICATION, RIGHT_PAYMENT_ACCOUNT_SEARCH, VerificationResultsPage);
export const PreAuditTabPanel     = makeTabPanel(WS_TAB_PRE_AUDIT,    RIGHT_RUN_PRE_AUDIT,          PreAuditPage);
export const GenerateTabPanel     = makeTabPanel(WS_TAB_GENERATE,     RIGHT_GENERATE_PAYLIST,       PaymentGenerationStepper);
export const PaylistsTabPanel     = makeTabPanel(WS_TAB_PAYLISTS,     RIGHT_PAYLIST_SEARCH,         PaylistListPage);
export const ReturnsTabPanel      = makeTabPanel(WS_TAB_RETURNS,      RIGHT_RETURN_FEEDBACK,        ReturnFeedbackPage);
