import PublicationIssuePage, { publicationIssueMetadata } from "@/components/resources/PublicationIssuePage";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  return publicationIssueMetadata("atm", (await params).id);
}

export default async function Page({ params }: Props) {
  return <PublicationIssuePage slug="atm" idParam={(await params).id} />;
}
