import React from 'react';
import { Tab } from '@material-ui/core';
import { useTranslations } from '@openimis/fe-core';
import {
  MODULE_NAME, TAB_PENDING, TAB_SUCCESS, TAB_FAILED,
} from '../constants';

export function VerificationPendingTabLabel({
  onChange,
  tabStyle,
  isSelected,
  modulesManager,
  pendingCount,
}) {
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  return (
    <Tab
      onChange={onChange}
      className={tabStyle(TAB_PENDING)}
      selected={isSelected(TAB_PENDING)}
      value={TAB_PENDING}
      label={`${pendingCount ?? 0} ${formatMessage('verificationResults.tab.pending')}`}
    />
  );
}

export function VerificationSuccessTabLabel({
  onChange,
  tabStyle,
  isSelected,
  modulesManager,
  passedCount,
}) {
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  return (
    <Tab
      onChange={onChange}
      className={tabStyle(TAB_SUCCESS)}
      selected={isSelected(TAB_SUCCESS)}
      value={TAB_SUCCESS}
      label={`${passedCount ?? 0} ${formatMessage('verificationResults.tab.success')}`}
    />
  );
}

export function VerificationFailedTabLabel({
  onChange,
  tabStyle,
  isSelected,
  modulesManager,
  failedCount,
  manualCount,
}) {
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  return (
    <Tab
      onChange={onChange}
      className={tabStyle(TAB_FAILED)}
      selected={isSelected(TAB_FAILED)}
      value={TAB_FAILED}
      label={`${(failedCount ?? 0) + (manualCount ?? 0)} ${formatMessage('verificationResults.tab.failed')}`}
    />
  );
}

