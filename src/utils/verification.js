export function matchReasonText(attempt, formatMessage, formatMessageWithValues) {
  if (!attempt) return null;
  if (attempt.matchReason === 'ANOTHER_MEMBER') {
    return formatMessageWithValues('nameMatch.reason.ANOTHER_MEMBER', { member: attempt.matchMember || '' });
  }
  if (attempt.matchReason) return formatMessage(`nameMatch.reason.${attempt.matchReason}`);
  return attempt.failureReason || null;
}
