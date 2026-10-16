/** Independent reads overlap; only the caller's current generation can publish.
 * @template P, A, T
 * @param {{readPreferences:()=>Promise<P>,resolveAccess:()=>Promise<A>,readTerms:()=>Promise<T>,isCurrent:()=>boolean}} dependencies
 * @returns {Promise<{preferences:P,access:A,terms:T|null,termsError:unknown}|null>}
 */
export async function loadVerifiedSession({ readPreferences, resolveAccess, readTerms, isCurrent }) {
  if (!isCurrent()) return null;
  const [preferences, access, acceptance] = await Promise.all([
    Promise.resolve().then(readPreferences),
    Promise.resolve().then(resolveAccess),
    Promise.resolve().then(readTerms).then(terms => ({ terms, termsError: null }), termsError => ({ terms: null, termsError })),
  ]);
  return isCurrent() ? { preferences, access, ...acceptance } : null;
}
