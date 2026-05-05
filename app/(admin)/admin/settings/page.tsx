import { getSettingsAction } from "@/app/actions/settings";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const settings = await getSettingsAction();
  return <SettingsClient initial={settings} />;
}
