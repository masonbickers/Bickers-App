export function eligibleReceiptCards(cards, personId, purchaseDate, today) {
  if (!personId || !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate || "") || !today) return [];
  return Object.values(cards || {}).filter((card) => card?.id
    && (card.active !== false || purchaseDate < today)
    && card.assignments?.some((assignment) => assignment.personId === personId
      && assignment.from && assignment.from <= purchaseDate
      && (!assignment.to || assignment.to >= purchaseDate)));
}

// A card choice is independent of merchant/amount edits and original attachments.
// Missing touch metadata on an older draft is deliberately not treated as consent.
export function defaultReceiptCardId(row, response, today) {
  const actor = response?.actor, workspace = response?.workspace;
  if (!row || row.cardTouched !== false || row.fields?.cardId || row.action !== "receipt.submit"
    || row.sendOperation || row.sendAttempted || row.rejectedOperation || row.acknowledgedAt || row.phase === "sent"
    || row.requestedTransactionId || row.fields?.requestedTransactionId
    || !actor?.personId || actor.personId !== row.capturedPersonId || actor.uid !== row.uid || workspace?.companyId !== row.companyId) return "";
  const cards = eligibleReceiptCards(workspace.cards, actor.personId, row.fields.purchaseDate, today);
  return cards.length === 1 ? cards[0].id : "";
}
