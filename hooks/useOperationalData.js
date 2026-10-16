import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { useCallback, useMemo } from "react";

import { db } from "../firebaseConfig";
import { isBookingVisibleToEmployee } from "../lib/bookingVisibility";
import { fetchEmployeeHistory } from "../lib/hrHistoryApi";
import { updateHistoryCache } from "../lib/privateHistoryClient";
import { removeCollectionRow, upsertCollectionRow } from "../lib/sessionCache";
import { useAuth } from "../providers/AuthProvider";
import { useCachedResource, useDataCache } from "../providers/DataCacheProvider";

const EMPTY_ROWS = Object.freeze([]);

function belongsToCompany(row, companyId) {
  const rowCompany = String(row?.companyId || "").trim();
  return !companyId || !rowCompany || rowCompany === String(companyId).trim();
}

async function fetchCollection(collectionName, companyId) {
  if (!companyId) return EMPTY_ROWS;
  const snapshot = await getDocs(
    query(collection(db, collectionName), where("companyId", "==", companyId))
  );
  return snapshot.docs
    .map((document) => ({ ...document.data(), id: document.id }))
    .filter((row) => belongsToCompany(row, companyId));
}

export function useCompanyCollection(collectionName, options = {}) {
  const { employee, isAuthed, loading } = useAuth();
  const { mutate } = useDataCache();
  const companyId = String(employee?.companyId || "").trim();
  const enabled = !loading && isAuthed && !!companyId && (options.enabled ?? true);
  const cacheKey = `collection:${collectionName}:company`;
  const resource = useCachedResource({
    key: cacheKey,
    enabled,
    ttlMs: options.ttlMs,
    fetcher: () => fetchCollection(collectionName, companyId),
  });
  const upsertRow = useCallback(
    (row) => mutate(cacheKey, (current) => upsertCollectionRow(current, row)),
    [cacheKey, mutate]
  );
  const removeRow = useCallback(
    (id) => mutate(cacheKey, (current) => removeCollectionRow(current, id)),
    [cacheKey, mutate]
  );

  return {
    ...resource,
    data: Array.isArray(resource.data) ? resource.data : EMPTY_ROWS,
    upsertRow,
    removeRow,
  };
}

export function useEmployees(options) {
  return useCompanyCollection("employees", options);
}

export function useVehicles(options) {
  return useCompanyCollection("vehicles", options);
}

export function useEquipment(options) {
  return useCompanyCollection("equipment", options);
}

export function useHolidays(options) {
  const { employee, user, isAuthed, loading } = useAuth();
  const { mutate } = useDataCache();
  // Version the response cache so pre-verification snapshots cannot mask annual review metadata.
  const cacheKey = `holidays:employee:${employee?.uid || "unknown"}:balance-v1`;
  const resource = useCachedResource({
    key: cacheKey,
    enabled: !loading && isAuthed && !!employee?.userCode && (options?.enabled ?? true),
    ttlMs: options?.ttlMs,
    fetcher: () => fetchEmployeeHistory(user, employee, "holidays"),
  });
  return {
    ...resource,
    data: Array.isArray(resource.data) ? resource.data : resource.data?.records || EMPTY_ROWS,
    withheldCount: resource.data?.withheldCount || 0,
    historyComplete: resource.data?.historyComplete === true,
    balanceVerification: resource.data?.balanceVerification,
    upsertRow: row => mutate(cacheKey, current => updateHistoryCache(current, rows => upsertCollectionRow(rows, row))),
    removeRow: id => mutate(cacheKey, current => updateHistoryCache(current, rows => removeCollectionRow(rows, id))),
  };
}

export function useContacts(options) {
  return useEmployees(options);
}

export function useBookings({ employeeOnly = false, ...options } = {}) {
  const { employee } = useAuth();
  const bookingResource = useCompanyCollection("bookings", options);
  const employeeResource = useEmployees(options);
  const data = useMemo(() => {
    if (!employeeOnly) return bookingResource.data;
    return bookingResource.data.filter((booking) =>
      isBookingVisibleToEmployee(booking, employee, employeeResource.data)
    );
  }, [bookingResource.data, employee, employeeOnly, employeeResource.data]);
  const refreshBookings = bookingResource.refresh;
  const refreshEmployees = employeeResource.refresh;
  const refresh = useCallback(async () => {
    const [bookings] = await Promise.all([
      refreshBookings(),
      refreshEmployees(),
    ]);
    return bookings;
  }, [refreshBookings, refreshEmployees]);

  return {
    ...bookingResource,
    data,
    employees: employeeResource.data,
    isInitialLoading:
      bookingResource.isInitialLoading || employeeResource.isInitialLoading,
    isRefreshing: bookingResource.isRefreshing || employeeResource.isRefreshing,
    error: bookingResource.error || employeeResource.error,
    refresh,
  };
}

export function useEmployeeTimesheets(options = {}) {
  const { employee, user, isAuthed, loading } = useAuth();
  const { mutate } = useDataCache();
  const employeeCode = String(employee?.userCode || "").trim();
  const companyId = String(employee?.companyId || "").trim();
  const enabled = !loading && isAuthed && !!companyId && !!employeeCode && (options.enabled ?? true);
  const cacheKey = `timesheets:employee:${employeeCode || "unknown"}`;
  const timesheets = useCachedResource({
    key: cacheKey,
    enabled,
    ttlMs: options.ttlMs,
    fetcher: () => fetchEmployeeHistory(user, employee, "timesheets"),
  });
  const upsertTimesheet = useCallback(
    (timesheet) => {
      const weekStart = timesheet?.weekStart || timesheet?.weekISO || "";
      const id =
        timesheet?.id ||
        (employeeCode && weekStart ? `${employeeCode}_${weekStart}` : "");
      return mutate(cacheKey, current => updateHistoryCache(current, rows =>
        upsertCollectionRow(rows, { ...timesheet, id, employeeCode: timesheet?.employeeCode || employeeCode }, ["id", "weekStart", "weekISO"])
      ));
    },
    [cacheKey, employeeCode, mutate]
  );
  const removeTimesheet = useCallback(
    (identity) =>
      mutate(cacheKey, current => updateHistoryCache(current, rows =>
        removeCollectionRow(rows, identity, ["id", "weekStart", "weekISO"])
      )),
    [cacheKey, mutate]
  );

  return {
    ...timesheets,
    data: Array.isArray(timesheets.data) ? timesheets.data : timesheets.data?.records || EMPTY_ROWS,
    withheldCount: timesheets.data?.withheldCount || 0,
    historyComplete: timesheets.data?.historyComplete === true,
    upsertTimesheet,
    removeTimesheet,
  };
}

export function useTimesheetQueries(options = {}) {
  const { employee, isAuthed, loading } = useAuth();
  const employeeCode = String(employee?.userCode || "").trim();
  const companyId = String(employee?.companyId || "").trim();
  const enabled = !loading && isAuthed && !!companyId && !!employeeCode && (options.enabled ?? true);
  const queries = useCachedResource({
    key: `timesheet-queries:employee:${employeeCode || "unknown"}`,
    enabled,
    ttlMs: options.ttlMs,
    fetcher: async () => {
      const snapshot = await getDocs(
        query(
          collection(db, "timesheetQueries"),
          where("companyId", "==", companyId),
          where("employeeCode", "==", employeeCode),
          where("ownerUid", "==", employee.uid),
          where("employeeId", "==", employee.employeeId),
          limit(options.limit || 30)
        )
      );
      return snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));
    },
  });

  return {
    ...queries,
    data: Array.isArray(queries.data) ? queries.data : EMPTY_ROWS,
  };
}
