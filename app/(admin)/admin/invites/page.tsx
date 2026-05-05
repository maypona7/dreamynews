import { listInvitesAction } from "@/app/actions/invites";
import InvitesClient from "./InvitesClient";

export default async function InvitesPage() {
  const invites = await listInvitesAction();
  return <InvitesClient initialInvites={invites} />;
}
