import type { Metadata } from "next";

const BACKEND = "https://api.shavesplash.app";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${BACKEND}/api/forum/threads/${id}`, { next: { revalidate: 3600 } });
    const data = await res.json();
    const thread = data.thread;
    if (!thread) return { title: "Forum" };
    const authorName = thread.author?.profile?.displayName ?? thread.author?.name ?? "Shaver";
    const description = `${thread.body.slice(0, 155).replace(/\n/g, " ")}…`;
    return {
      title: thread.title,
      description,
      openGraph: {
        title: `${thread.title} — ShaveSplash Forum`,
        description,
        url: `https://shavesplash.app/forum/${id}`,
        type: "article",
        authors: [authorName],
        publishedTime: thread.createdAt,
        modifiedTime: thread.updatedAt,
      },
      twitter: { card: "summary_large_image" },
    };
  } catch {
    return { title: "Forum" };
  }
}

export default async function ForumThreadLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let jsonLd = null;
  try {
    const res = await fetch(`${BACKEND}/api/forum/threads/${id}`, { next: { revalidate: 3600 } });
    const data = await res.json();
    const thread = data.thread;
    if (thread) {
      const authorName = thread.author?.profile?.displayName ?? thread.author?.name ?? "Shaver";
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "DiscussionForumPosting",
        "headline": thread.title,
        "text": thread.body,
        "datePublished": thread.createdAt,
        "dateModified": thread.updatedAt,
        "url": `https://shavesplash.app/forum/${id}`,
        "author": { "@type": "Person", "name": authorName },
        "interactionStatistic": {
          "@type": "InteractionCounter",
          "interactionType": "https://schema.org/ReplyAction",
          "userInteractionCount": thread.replies?.length ?? 0,
        },
      };
    }
  } catch {}

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
