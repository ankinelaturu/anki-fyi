import { Workspace } from "@/components/workspace";
import { getFolders } from "@/lib/content";

export default function Home() {
  const folders = getFolders();
  return <Workspace folders={folders} initialSlug="about/about-anki" />;
}
