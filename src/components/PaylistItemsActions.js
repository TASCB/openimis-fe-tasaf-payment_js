import React, { createContext, useContext } from 'react';
import { Button, Tooltip } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import SendIcon from '@material-ui/icons/Send';

export const PAYLIST_ITEMS_ACTIONS_KEY = 'tasafPayment.PaylistItems.actions';
export const PaylistActionsContext = createContext(null);

const useStyles = makeStyles((theme) => ({
  row: {
    display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: theme.spacing(1), whiteSpace: 'nowrap',
  },
}));

// Rendered by the paylist-items Searcher (actionsContributionKey); the page supplies state via context.
export default function PaylistItemsActions() {
  const classes = useStyles();
  const ctx = useContext(PaylistActionsContext);
  if (!ctx) return null;
  const {
    t, canSearch, canExport, onMusePreview, onExport,
    approve, submit, submitting,
  } = ctx;

  const primary = (action, icon, label, notAllowed) => action.visible && (
    <Tooltip title={action.allowed ? '' : notAllowed}>
      <span>
        <Button
          variant="contained"
          color="primary"
          startIcon={icon}
          disabled={submitting || !action.allowed}
          onClick={action.onClick}
        >
          {label}
        </Button>
      </span>
    </Tooltip>
  );

  return (
    <div className={classes.row}>
      {canSearch && <Button color="primary" onClick={onMusePreview}>{t('button.musePreview')}</Button>}
      {canSearch && (
        <Button color="primary" disabled={!canExport} onClick={onExport}>{t('button.exportPaylistPdf')}</Button>
      )}
      {primary(approve, <CheckCircleIcon />, t('button.approvePaylist'), t('paylist.detail.approveNotAllowed'))}
      {primary(submit, <SendIcon />, t('button.submitPaylist'), t('paylist.detail.submitNotAllowed'))}
    </div>
  );
}
