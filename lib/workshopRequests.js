export const WORKSHOP_FORM_COLLECTIONS = Object.freeze({
  full_service: "serviceRecords",
  minor_service: "serviceRecords",
  general_repair: "serviceRecords",
  vehicle_check: "workshopVehicleChecks",
  equipment_inspection: "equipmentInspections",
  mot_precheck: "motPreChecks",
});

const ROUTES = Object.freeze({
  full_service: (id) => `/service/service-form/${id}`,
  minor_service: (id) => `/service/minor-service/${id}`,
  general_repair: () => "/service/repair-form",
  vehicle_check: (id) => `/service/vehicle-check-form/${id}`,
  equipment_inspection: (id) => `/service/inspections/inspection-form/new-${id}`,
  mot_precheck: (id) => `/service/mot-precheck/${id}`,
});

export function routeForWorkshopRequest(request) {
  const route = ROUTES[request?.workType];
  if (!route || !request?.id || !request?.assetId) throw new Error("Unsupported workshop request");
  const requestId = encodeURIComponent(String(request.id));
  const assetId = encodeURIComponent(String(request.assetId));
  const assetKey = request.workType === "equipment_inspection" ? "equipmentDocId" : "vehicleId";
  return `${route(requestId)}?workshopRequestId=${requestId}&${assetKey}=${assetId}`;
}

export function completionForWorkshopRequest(request, form) {
  if (!request?.id || request.status !== "open") throw new Error("Request is not open");
  if (!form?.id || form.collection !== WORKSHOP_FORM_COLLECTIONS[request.workType]) throw new Error("Wrong completion form");
  if (String(form.assetId) !== String(request.assetId)) throw new Error("Wrong asset");
  if (!String(form.signedBy || "").trim()) throw new Error("A signature is required");
  return {
    status: "completed",
    formCollection: form.collection,
    formRecordId: String(form.id),
    completedBy: String(form.signedBy).trim(),
  };
}

export function isWorkshopRequestVisible(request, companyId, filter = "all") {
  return request?.companyId === companyId && (filter === "all" || request?.status === filter);
}
