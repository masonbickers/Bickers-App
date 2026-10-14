export const SERVICE_ROUTES = Object.freeze({
  settings: "/(protected)/service/settings",
  serviceList: "/(protected)/service/service-list",
  equipmentList: "/(protected)/service/equipment-list",
  defects: "/(protected)/service/defects",
  advisories: "/(protected)/service/advisories",
  activityHistory: "/(protected)/service/activity-history",
  mainApp: "/screens/homescreen",
});

export function getServiceOverviewState(resources) {
  const available = resources.some((resource) =>
    resource.data?.length > 0 || (!resource.isInitialLoading && !resource.error)
  );
  const failed = resources.some((resource) => Boolean(resource.error));
  const pending = resources.some((resource) => resource.isInitialLoading);
  if (!available) return failed ? "error" : "loading";
  return failed || pending ? "partial" : "ready";
}

export function getServiceOverviewNotice(resources, loadTimedOut = false) {
  if (resources.some((resource) => Boolean(resource.error))) {
    return { tone: "warning", title: "Fleet data is incomplete", retry: true };
  }
  if (resources.some((resource) => resource.isInitialLoading)) {
    return loadTimedOut
      ? { tone: "info", title: "Some fleet data is taking longer than usual", retry: true }
      : { tone: "info", title: "Loading remaining fleet data", retry: false };
  }
  return null;
}

export function createServiceOverviewActions({ equipmentDueCount = 0, openDefectCount = 0, advisoryCount = 0, recentActivityCount = 0 }, navigate) {
  return [
    { id: "fleet", icon: "clipboard", title: "All MOT & Service", subtitle: "See full maintenance list", onPress: () => navigate(SERVICE_ROUTES.serviceList) },
    { id: "equipment", icon: "package", title: "Equipment", subtitle: equipmentDueCount > 0 ? `${equipmentDueCount} due or overdue` : "Inspection dates OK", badgeCount: equipmentDueCount, onPress: () => navigate(SERVICE_ROUTES.equipmentList) },
    { id: "defects", icon: "alert-triangle", title: "Defects & Issues", subtitle: openDefectCount > 0 ? `${openDefectCount} open defect${openDefectCount === 1 ? "" : "s"} need attention` : "No open approved defects", badgeCount: openDefectCount, onPress: () => navigate(SERVICE_ROUTES.defects) },
    { id: "advisories", icon: "eye", title: "Advisories", subtitle: advisoryCount > 0 ? `${advisoryCount} amber item${advisoryCount === 1 ? "" : "s"} to monitor` : "No amber advisories", badgeCount: advisoryCount, onPress: () => navigate(SERVICE_ROUTES.advisories) },
    { id: "activity", icon: "activity", title: "Activity History", subtitle: recentActivityCount > 0 ? `${recentActivityCount} recent update${recentActivityCount === 1 ? "" : "s"}` : "Services, repairs and defects", badgeCount: recentActivityCount, onPress: () => navigate(SERVICE_ROUTES.activityHistory) },
  ];
}
