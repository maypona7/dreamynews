import RedeemClient from "./RedeemClient";

export default async function InviteRedeemPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <RedeemClient code={code} />;
}
