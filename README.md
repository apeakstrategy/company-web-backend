# A Peak Strategy API

Express API for the company website. Works use Prisma with MySQL. Existing Firebase files and routes are retained for future push notifications and gradual migration.

## Setup

Install Node.js 20 LTS and MySQL 8, copy the variables from `.env.example` into `.env`, then use a dedicated database user (not MySQL root).

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run db:seed
npm run dev
```

Example: `DATABASE_URL="mysql://apeak_user:url_encoded_password@127.0.0.1:3306/apeak_strategy"`. URL-encode special characters in the password.

## Works API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/works` | Published works with pagination and filters |
| `GET` | `/api/works/categories` | Published categories |
| `GET` | `/api/works/:slug` | Complete published work |
| `POST` | `/api/admin/works` | Create a work (admin) |
| `PUT` | `/api/admin/works/:id` | Replace a work (admin) |
| `PATCH` | `/api/admin/works/:id` | Partially update a work (admin) |
| `DELETE` | `/api/admin/works/:id` | Delete a work and dependent records (admin) |

List parameters are `page`, `limit` (maximum 100), `category`, `status`, `featured`, `search`, `sortBy`, and `sortOrder`.

```json
{
  "title": "Tech Startup Website",
  "category": "Web Development",
  "shortDescription": "Modern, fast, and elegant web experience",
  "overview": "A complete redesign and development engagement.",
  "coverImageUrl": "https://res.cloudinary.com/account/image/upload/cover.jpg",
  "coverImagePublicId": "works/project/cover",
  "coverImageAltText": "Website shown on several devices",
  "client": "Example Client",
  "timeline": "3 Months",
  "teamSize": "4 Members",
  "results": "Conversions increased by 45%",
  "projectUrl": "https://example.com",
  "isFeatured": true,
  "status": "PUBLISHED",
  "sortOrder": 0,
  "technologies": ["Next.js", "Node.js", "MySQL"],
  "services": ["Strategy", "Design", "Development"],
  "sections": [{
    "heading": "The challenge",
    "paragraphs": ["First paragraph.", "Second paragraph."],
    "images": [{
      "url": "https://res.cloudinary.com/account/image/upload/detail.jpg",
      "publicId": "works/project/detail",
      "altText": "Project detail",
      "caption": "Optional caption",
      "width": 1600,
      "height": 900
    }]
  }],
  "galleryImages": []
}
```

The API stores Cloudinary URLs and public IDs. Actual asset upload/deletion belongs in the authenticated admin phase.

## Ubuntu production

- Run the API as an unprivileged Linux user through systemd or PM2.
- Put Nginx in front of Express and terminate HTTPS with a valid certificate.
- Set `NODE_ENV=production`, `TRUST_PROXY=true`, and `CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com`.
- Bind MySQL to localhost, block public port 3306, use a least-privilege user, and schedule encrypted backups.
- Deploy with `npm ci`, `npm run prisma:generate`, and `npm run prisma:migrate:deploy`. Run migrations once per release.
- Never run `prisma migrate dev` or `prisma migrate reset` in production.
- Keep `.env` outside Git and readable only by the application user.
- Admin sessions use signed HTTP-only cookies. Every mutation also requires the CSRF token returned by login or `/me` in the `x-csrf-token` header.

## Admin bootstrap

Set a random `JWT_SECRET` of at least 32 characters plus `ADMIN_SEED_NAME`, `ADMIN_SEED_EMAIL`, and an `ADMIN_SEED_PASSWORD` of at least 12 characters. Then run:

```bash
npm run prisma:migrate:deploy
npm run prisma:generate
npm run db:seed-admin
```

Protected endpoints include `GET /api/admin/works`, `GET /api/admin/works/stats`, full work CRUD, and `/api/admin/uploads`. Login endpoints are under `/api/auth/admin`.

## Blogs

Public endpoints are `GET /api/blogs`, `/api/blogs/categories`, `/api/blogs/tags`, `GET /api/blogs/:slug`, `GET /api/blogs/:slug/related`, and the rate-limited `POST /api/blogs/:slug/view` counter.

Authenticated editorial endpoints are under `/api/admin/blogs` and provide statistics, pagination, draft access, complete nested CRUD, tags, SEO data, sections, paragraphs, and images. Seed the original six frontend posts with:

```bash
npm run db:seed-blogs
```

Health check: `GET /health`.

## Contact inbox and email

`POST /api/contact` validates and stores a website inquiry before attempting email delivery. It uses a honeypot, minimum completion time, duplicate protection, a dedicated rate limit, and optional Cloudflare Turnstile. Admin endpoints under `/api/admin/inquiries` provide statistics, filtering, detail, status and priority changes, replies, notification retry, archiving, and super-admin-only permanent deletion.

Configure `SMTP_*`, `MAIL_FROM_*`, `CONTACT_NOTIFICATION_TO`, and `ADMIN_APP_URL`. The From address must belong to a domain verified by your email provider; visitor addresses are used only as `Reply-To`. In production, configure matching SPF, DKIM, and DMARC DNS records. Set `TURNSTILE_SECRET_KEY` in the API and the matching `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in the public frontend.

On Ubuntu, allow outbound SMTP for your provider, keep port 5000 private behind Nginx, set `TRUST_PROXY=true`, and include both the public site and admin origin in `CORS_ORIGINS`. After each deployment run `npm ci`, `npm run prisma:generate`, and `npm run prisma:migrate:deploy`, then restart the process. Monitor failed notifications in the Messages screen and configure database backups; inquiry records are retained even during an email outage.
