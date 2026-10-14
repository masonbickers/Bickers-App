import NativeTabLayout from "../../../components/app/NativeTabLayout";
import { useServiceTabs } from "../../../components/app/service-footer";

export default function ServiceTabs() {
  const tabs = useServiceTabs();
  return <NativeTabLayout tabs={tabs} />;
}
