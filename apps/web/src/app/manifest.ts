import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ForzaFit — трекер тренировок',
    short_name: 'ForzaFit',
    description: 'Трекер тренировок и питания',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f0f13',
    theme_color: '#7C3AED',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Новая тренировка',
        url: '/workouts/new',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
    categories: ['fitness', 'health', 'sports'],
  }
}
