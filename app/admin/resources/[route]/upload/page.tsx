import UploadClient from "./uploadClient";

export default function Page({ params }: { params: { route: string } }) {
  return <UploadClient route={decodeURIComponent(params.route)} />;
}