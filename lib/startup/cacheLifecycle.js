export function createStartupCacheLifecycle({ store, clear }) {
  return {
    async checkIdentity(identity) {
      await store.restore();
      if (store.getActive() && !store.matchesIdentity(identity)) await store.invalidate('identity-changed');
    },
    async prepareAccountCache({ clerkIdentity, uid }) {
      await store.restore();
      if (store.matchesIdentity({ ...clerkIdentity, uid })) return;
      await store.invalidate('identity-changed');
      await clear();
    },
  };
}
