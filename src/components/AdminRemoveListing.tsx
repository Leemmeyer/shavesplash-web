"use client";

import { useSession } from "@/lib/session-context";
import AdminRemoveButton from "./AdminRemoveButton";
import { useRouter } from "next/navigation";

const ADMIN_EMAIL = "leemeyernyc@gmail.com";

export default function AdminRemoveListing({ listingId }: { listingId: string }) {
  const { session, loading } = useSession();
  const router = useRouter();

  if (loading || session?.user.email !== ADMIN_EMAIL) return null;

  return (
    <div className="mb-4">
      <AdminRemoveButton
        endpoint={`/api/bst/listings/${listingId}/admin`}
        onRemoved={() => router.replace("/bst")}
        label="Remove listing"
      />
    </div>
  );
}
