// app/resources/page.tsx
import { redirect } from "next/navigation";

export default function ResourcesIndex() {
  redirect("/resources/atm");
}