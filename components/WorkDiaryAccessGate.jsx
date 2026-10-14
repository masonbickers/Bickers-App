import { Redirect } from "expo-router";
import { getWorkDiaryRedirect } from "../lib/workDiaryAccess";
import { useAuth } from "../providers/AuthProvider";

export default function WorkDiaryAccessGate({ children }) {
  const session = useAuth();
  // Keep diary components unmounted while identity/access is being checked.
  if (session.loading) return null;
  const redirect = getWorkDiaryRedirect(session);
  if (redirect) return <Redirect href={redirect} />;
  return children;
}
