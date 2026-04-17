/**
 * Tab label contributions for VerificationResultsPage.
 *
 * Registered under 'tasafPayment.TabPanel.label' so other modules
 * can add tabs to the verification results view by contributing to
 * that key in their own index.js.
 *
 * Each label component receives: onChange, tabStyle, isSelected, modulesManager
 * from the <Contributions> host — same props as payroll/individual tab labels.
 */
import React from 'react';
import { Tab } from '@material-ui/core';
import { useTranslations } from '@openimis/fe-core';
import { MODULE_NAME, TAB_PASSED, TAB_FAILED } from '../constants';

export function VerificationPassedTabLabel({ onChange, tabStyle, isSelected, modulesManager }) {
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  return (
    <Tab
      onChange={onChange}
      className={tabStyle(TAB_PASSED)}
      selected={isSelected(TAB_PASSED)}
      value={TAB_PASSED}
      label={formatMessage('verificationResults.tab.passed')}
    />
  );
}

export function VerificationFailedTabLabel({ onChange, tabStyle, isSelected, modulesManager }) {
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  return (
    <Tab
      onChange={onChange}
      className={tabStyle(TAB_FAILED)}
      selected={isSelected(TAB_FAILED)}
      value={TAB_FAILED}
      label={formatMessage('verificationResults.tab.failed')}
    />
  );
}
