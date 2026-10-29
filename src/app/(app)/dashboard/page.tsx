import { redirect } from "next/navigation";

// The old dashboard's numbers live on Reports now; clearing sample data is in the Inbox.
export default function DashboardPage() {
  redirect("/reports");
}
