import React from 'react';
import { useSelector } from 'react-redux';
import { Tab } from '@material-ui/core';
import { useTranslations } from '@openimis/fe-core';
import {
  MODULE_NAME, RIGHT_ACCOUNT_CHECK, TAB_CHECK, TAB_PENDING, TAB_REVIEW, TAB_SUCCESS, TAB_FAILED, TAB_GEPG,
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

export function VerificationReviewTabLabel({
  onChange,
  tabStyle,
  isSelected,
  modulesManager,
  manualCount,
}) {
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  return (
    <Tab
      onChange={onChange}
      className={tabStyle(TAB_REVIEW)}
      selected={isSelected(TAB_REVIEW)}
      value={TAB_REVIEW}
      label={`${manualCount ?? 0} ${formatMessage('verificationResults.tab.review')}`}
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
}) {
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  return (
    <Tab
      onChange={onChange}
      className={tabStyle(TAB_FAILED)}
      selected={isSelected(TAB_FAILED)}
      value={TAB_FAILED}
      label={`${failedCount ?? 0} ${formatMessage('verificationResults.tab.failed')}`}
    />
  );
}


export function VerificationGepgTabLabel({
  onChange,
  tabStyle,
  isSelected,
  modulesManager,
  gepgCount,
}) {
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  return (
    <Tab
      onChange={onChange}
      className={tabStyle(TAB_GEPG)}
      selected={isSelected(TAB_GEPG)}
      value={TAB_GEPG}
      label={`${gepgCount ?? 0} ${formatMessage('verificationResults.tab.gepg')}`}
    />
  );
}

export function VerificationCheckTabLabel({
  onChange,
  tabStyle,
  isSelected,
  modulesManager,
}) {
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const rights = useSelector((store) => store.core?.user?.i_user?.rights ?? []);
  if (!rights.includes(RIGHT_ACCOUNT_CHECK)) return null;
  return (
    <Tab
      onChange={onChange}
      className={tabStyle(TAB_CHECK)}
      selected={isSelected(TAB_CHECK)}
      value={TAB_CHECK}
      label={formatMessage('accountCheck.tab')}
    />
  );
}
