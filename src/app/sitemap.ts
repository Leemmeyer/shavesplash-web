import { MetadataRoute } from 'next';

const BASE = 'https://shavesplash.app';
const BACKEND = 'https://api.shavesplash.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,                       changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/bst`,              changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${BASE}/sotd`,             changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE}/forum`,            changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE}/subscribe`,        changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/about`,            changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/privacy`,          changeFrequency: 'monthly', priority: 0.3 },
  ];

  let listingRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${BACKEND}/api/bst/listings`, { next: { revalidate: 3600 } });
    const data = await res.json();
    listingRoutes = (data.listings ?? []).map((l: { id: string; updatedAt: string }) => ({
      url: `${BASE}/bst/${l.id}`,
      lastModified: new Date(l.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch {}

  let threadRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${BACKEND}/api/forum/threads`, { next: { revalidate: 3600 } });
    const data = await res.json();
    threadRoutes = (data.threads ?? []).map((t: { id: string; updatedAt: string }) => ({
      url: `${BASE}/forum/${t.id}`,
      lastModified: new Date(t.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch {}

  return [...staticRoutes, ...listingRoutes, ...threadRoutes];
}
