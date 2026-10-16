/** Independent reads overlap; only the caller's current generation can publish.
 * @template P, A, T
 * @param {{readPreferences:()=>Promise<P>,resolveAccess:()=>Promise<A>,readTerms:()=>Promise<T>,isCurrent:()=>boolean}} dependencies
 * @returns {Promise<{preferences:P,access:A,terms:T|null,termsError:unknown}|null>}
 */
export async function loadVerifiedSession({ readPreferences, resolveAccess, readTerms, isCurrent }) {
  if (!isCurrent()) return null;
  const [stored, access, acceptance] = await Promise.all([
    // Preference storage must not hide a later rejection of current access.
    Promise.resolve().then(readPreferences).then(preferences => ({ preferences }), error => ({ error })),
    Promise.resolve().then(resolveAccess),
    Promise.resolve().then(readTerms).then(terms => ({ terms, termsError: null }), termsError => ({ terms: null, termsError })),
  ]);
  if (!isCurrent()) return null;
  if ('error' in stored) throw stored.error;
  return { preferences: stored.preferences, access, ...acceptance };
}
