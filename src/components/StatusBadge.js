import React from 'react';
import { Chip } from '@material-ui/core';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { useModulesManager, useTranslations } from '@openimis/fe-core';
import { MODULE_NAME, VERIFICATION_STATUS } from '../constants';

const styles = (theme) => ({
  chip:         { fontWeight: 500, fontSize: '0.75rem' },
  verified:     { backgroundColor: '#4caf50', color: '#fff' },
  failed:       { backgroundColor: theme.palette.error.main, color: '#fff' },
  manual:       { backgroundColor: theme.palette.warning.main, color: '#fff' },
  pending:      { backgroundColor: theme.palette.grey[500], color: '#fff' },
  pendingMuse:  { backgroundColor: '#1976d2', color: '#fff' },  // blue — awaiting MUSE
});

function StatusBadge({ classes, status, size = 'small' }) {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);

  const label = formatMessage(`paymentAccount.verificationStatus.${status}`);

  let chipClass = classes.pending;
  if (status === VERIFICATION_STATUS.VERIFIED)     chipClass = classes.verified;
  else if (status === VERIFICATION_STATUS.FAILED)  chipClass = classes.failed;
  else if (status === VERIFICATION_STATUS.MANUAL)  chipClass = classes.manual;
  else if (status === VERIFICATION_STATUS.PENDING_MUSE) chipClass = classes.pendingMuse;

  return <Chip label={label} size={size} className={`${classes.chip} ${chipClass}`} />;
}

export default withTheme(withStyles(styles)(StatusBadge));
