import NativeTabLayout from "../../../components/app/NativeTabLayout";

const tabs = [
    { route: "/screens/homescreen", label: "Home", iconActive: "home", iconInactive: "home-outline", symbol: { active: "house.fill", inactive: "house" } },
    { route: "/screens/schedule", label: "Schedule", iconActive: "calendar", iconInactive: "calendar-outline", symbol: { active: "calendar", inactive: "calendar" } },
    { route: "/job", label: "Jobs", iconActive: "document-text", iconInactive: "document-text-outline", symbol: { active: "doc.text.fill", inactive: "doc.text" } },
    { route: "/contacts", label: "Contacts", iconActive: "people", iconInactive: "people-outline", symbol: { active: "person.2.fill", inactive: "person.2" } },
    { route: "/me", label: "Me", iconActive: "person-circle", iconInactive: "person-circle-outline", symbol: { active: "person.crop.circle.fill", inactive: "person.crop.circle" } },
  ];

export default function MainTabs() { return <NativeTabLayout tabs={tabs} />; }
