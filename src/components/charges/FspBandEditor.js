import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  Button, CircularProgress, IconButton, Table, TableBody, TableCell, TableHead, TableRow, TextField,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import { formatMessage, formatMessageWithValues } from '@openimis/fe-core';
import { fetchFspBandSet, saveFspCharges } from '../../actions';
import { MODULE_NAME } from '../../constants';

const useStyles = makeStyles((theme) => ({
  bands: { '& th:last-child, & td:last-child': { width: 56 } },
  row: {
    display: 'flex', alignItems: 'center', gap: theme.spacing(2), marginTop: theme.spacing(1.5), flexWrap: 'wrap',
  },
  hint: { color: theme.palette.text.secondary },
  reason: { marginTop: theme.spacing(1) },
}));

const r0 = (v) => !Number.isNaN(v);
const amount = (v) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 });

const toRow = (b) => ({
  lowerAmount: b.lowerAmount ?? '',
  upperAmount: b.upperAmount ?? '',
  withdrawal: b.withdrawal ?? '',
});

function FspBandEditor({ fspCode, canManage, pending }) {
  const intl = useIntl();
  const classes = useStyles();
  const dispatch = useDispatch();
  const t = (id) => formatMessage(intl, MODULE_NAME, id);
  const state = useSelector((s) => s.tasafPayment);
  const [rows, setRows] = useState([]);
  const [reason, setReason] = useState('');
  const editable = canManage && !pending;

  useEffect(() => { if (fspCode) dispatch(fetchFspBandSet(fspCode)); }, [fspCode]);
  useEffect(() => { setRows((state?.fspBandSet ?? []).map(toRow)); }, [state?.fspBandSet]);

  const setCell = (idx, field, value) => setRows(
    (rs) => rs.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
  );

  const parsedRows = rows
    .filter((r) => r.lowerAmount !== '' && r.upperAmount !== '')
    .map((r) => [Number(r.lowerAmount), Number(r.upperAmount)])
    .filter(([lo, hi]) => r0(lo) && r0(hi))
    .sort((a, b) => a[0] - b[0]);
  const overlap = parsedRows.some((band, i) => i > 0 && band[0] <= parsedRows[i - 1][1]);
  const gaps = parsedRows.slice(1).flatMap((band, i) => (band[0] > parsedRows[i][1] + 1
    ? [{ from: parsedRows[i][1] + 1, to: band[0] - 1 }] : []));
  const lowest = parsedRows.length ? parsedRows[0][0] : null;
  const incomplete = rows.some((r) => r.lowerAmount === '' || r.upperAmount === '' || r.withdrawal === '');

  if (state?.fetchingBandSet) return <CircularProgress size={24} />;

  return (
    <>
      {pending && <Typography variant="body2" className={classes.hint}>{t('fsp.bands.pending')}</Typography>}
      {!rows.length && <Typography variant="body2" className={classes.hint}>{t('fsp.bands.none')}</Typography>}
      {!!rows.length && (
        <Table size="small" className={classes.bands}>
          <TableHead>
            <TableRow>
              <TableCell>{t('charges.lowerAmount')}</TableCell>
              <TableCell>{t('charges.upperAmount')}</TableCell>
              <TableCell>{t('charges.withdrawal')}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, idx) => (
              // eslint-disable-next-line react/no-array-index-key
              <TableRow key={idx}>
                {['lowerAmount', 'upperAmount', 'withdrawal'].map((field) => (
                  <TableCell key={field}>
                    <TextField
                      type="number"
                      fullWidth
                      value={r[field]}
                      disabled={!editable}
                      onChange={(e) => setCell(idx, field, e.target.value)}
                    />
                  </TableCell>
                ))}
                <TableCell>
                  {editable && (
                    <IconButton size="small" onClick={() => setRows((rs) => rs.filter((_, i) => i !== idx))}>
                      <DeleteIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {overlap && <Typography variant="body2" color="error">{t('charges.config.overlap')}</Typography>}
      {gaps.map((g) => (
        <Typography key={g.from} variant="body2" color="error">
          {formatMessageWithValues(intl, MODULE_NAME, 'charges.config.gap', { from: amount(g.from), to: amount(g.to) })}
        </Typography>
      ))}
      {lowest > 1 && (
        <Typography variant="body2" className={classes.hint}>
          {formatMessageWithValues(intl, MODULE_NAME, 'charges.config.lowest', { lowest: amount(lowest) })}
        </Typography>
      )}
      {editable && (
        <TextField
          fullWidth
          label={t('museSettings.reason')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          inputProps={{ maxLength: 500 }}
          className={classes.reason}
        />
      )}
      {editable && (
        <div className={classes.row}>
          <Button
            startIcon={<AddIcon />}
            onClick={() => setRows((rs) => [...rs, { lowerAmount: '', upperAmount: '', withdrawal: '' }])}
          >
            {t('charges.config.addRow')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            disableElevation
            disabled={!rows.length || incomplete || overlap || state?.submittingMutation}
            onClick={() => dispatch(saveFspCharges(fspCode, rows, reason, t('charges.config.mutation.apply')))}
          >
            {t('charges.config.apply')}
          </Button>
        </div>
      )}
    </>
  );
}

export default FspBandEditor;
