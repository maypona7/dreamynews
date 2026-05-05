import { listMembersAction } from "@/app/actions/members";
import MembersClient from "./MembersClient";

export default async function MembersPage() {
  const members = await listMembersAction();
  return <MembersClient initialMembers={members} />;
}
