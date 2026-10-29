import type { Metadata } from "next";

export const metadata: Metadata = { title: "Inbox" };

export default function InboxFolderPage() {
  return (
    <div className="grid h-full min-h-60 place-items-center p-8 text-center">
      <div>
        <p className="font-display text-lg font-semibold">Pick a conversation</p>
        <p className="mt-1 text-sm text-zinc-500">Its history, next step and reply box open here.</p>
      </div>
    </div>
  );
}
