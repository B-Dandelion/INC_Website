import PublicationIssuePage, { publicationIssueMetadata } from "@/components/resources/PublicationIssuePage";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  return publicationIssueMetadata("heartbeat-of-atoms", (await params).id);
}

export default async function Page({ params }: Props) {
  return <PublicationIssuePage slug="heartbeat-of-atoms" idParam={(await params).id} />;
}
