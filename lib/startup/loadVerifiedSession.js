/** Independent reads overlap; only the caller's current generation can publish. */
export async function loadVerifiedSession({ readPreferences, resolveAccess, readTerms, isCurrent }) {
  if (!isCurrent()) return null;
  const [preferences, access, acceptance] = await Promise.all([
    Promise.resolve().then(readPreferences),
    Promise.resolve().then(resolveAccess),
    Promise.resolve().then(readTerms).then(terms => ({ terms, termsError: null }), termsError => ({ terms: null, termsError })),
  ]);
  return isCurrent() ? { preferences, access, ...acceptance } : null;
}
