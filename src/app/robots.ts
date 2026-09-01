import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/sign-in', '/verify-otp', '/set-display-name', '/import', '/preview'],
    },
    sitemap: 'https://shavesplash.app/sitemap.xml',
  };
}
