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

## Gemini Chatbot Setup

The website chat widget calls `POST /api/chat` on this backend. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey), add `GEMINI_API_KEY=...` to the backend `.env` (see `.env.example`), and restart the backend. The key must remain server-side. The backend uses the official `@google/genai` SDK with `gemini-3.5-flash-lite`; there is no browser-side Gemini connection.

For local testing, run this API on port 5000 and the frontend on port 3000. The frontend uses `NEXT_PUBLIC_API_URL` (for example `http://localhost:5000/api`); set it to the public HTTPS API URL in production. Add the frontend's exact origin to `CORS_ORIGINS`. If a reverse proxy is used, set `TRUST_PROXY=true` only when that proxy is trusted so IP rate limiting works as intended.

The route accepts JSON `{ "message": "What services do you offer?", "history": [] }` and returns `{ "success": true, "reply": "...", "timestamp": "..." }`. Input is limited to 1,200 characters, 10 recent history messages, and a 16 KB request body. The route permits 8 requests per IP per minute and uses a 12-second Gemini timeout. Chats are not stored. Update `src/knowledge/company-knowledge.md` when company facts change, then restart the backend. The in-memory limiter is per process; use a shared rate-limit store if deploying multiple API instances.

The endpoint returns a safe contact-oriented error if the key is missing or Gemini is unavailable. Test locally with the widget or send a JSON POST to `/api/chat`; `npm run check` and `npm test` cover validation and API behavior without a live Gemini key.

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

`POST /api/contact` validates and stores a website inquiry, sends it to the company inbox, then sends an automatic confirmation to the visitor. Success is returned only after the company email is accepted by SMTP. A failed company email returns an error and the saved inquiry can be retried without creating another record. If only the confirmation fails, the response reports `confirmationSent: false` and the confirmation can be retried with the same form content. It uses a honeypot, minimum completion time, duplicate protection, a dedicated rate limit, and optional Cloudflare Turnstile. Admin endpoints under `/api/admin/inquiries` provide statistics, filtering, detail, status and priority changes, replies, notification retry, archiving, and super-admin-only permanent deletion.

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM_ADDRESS=info@apeakstrategy.com`, `MAIL_REPLY_ADDRESS=info@apeakstrategy.com`, `CONTACT_NOTIFICATION_TO=info@apeakstrategy.com`, and `ADMIN_APP_URL`. Use the SMTP host and credentials supplied by the provider hosting `info@apeakstrategy.com`; `SMTP_SECURE=true` is typical for port 465 and `false` for port 587. The From address must belong to a domain verified by your email provider; visitor addresses are used only as `Reply-To`. In production, configure matching SPF, DKIM, and DMARC DNS records. Turnstile is optional: set `TURNSTILE_SECRET_KEY` in the API, the matching `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in the public frontend, and `TURNSTILE_HOSTNAMES` to the comma-separated frontend hosts to enable it. The contact widget uses and the backend validates the action `contact`. Use `localhost,127.0.0.1` only for local development; production should use `apeakstrategy.com,www.apeakstrategy.com` and must not include local hosts. If no secret is set, the contact form continues to use its rate limit, honeypot, and minimum completion time checks.

For local development, set `TURNSTILE_TEST_MODE=true` in the API and `NEXT_PUBLIC_TURNSTILE_TEST_MODE=true` in the frontend. Development mode then uses Cloudflare's official always-pass test key pair, so the production widget does not need to authorize localhost. Both switches are ignored when `NODE_ENV=production`; production continues to require the configured real keys, action, and hostname allowlist.

On Ubuntu, allow outbound SMTP for your provider, keep port 5000 private behind Nginx, set `TRUST_PROXY=true`, and include both the public site and admin origin in `CORS_ORIGINS`. After each deployment run `npm ci`, `npm run prisma:generate`, and `npm run prisma:migrate:deploy`, then restart the process. Monitor failed notifications in the Messages screen and configure database backups; inquiry records are retained even during an email outage.

## Client stories

`GET /api/testimonials` returns only published testimonials with confirmed permission. Public responses include the client's name, occupation or organization, quote, and an optional link to a currently published project. The homepage hides this section until a real story has been published.

Authenticated admins manage stories at `/api/admin/testimonials` with list, detail, create, update, and delete endpoints. The admin form supports drafts, display order, an optional published project, and a permission confirmation required before publishing. Public write requests to `/api/testimonials` are unavailable. Run the testimonial migration before starting the updated API.

## Email updates

The footer uses `POST /api/newsletter/subscribe`. The API records an opt-in request as pending and emails a confirmation link; only `POST /api/newsletter/confirm` activates it. Every campaign includes a visible unsubscribe link and one-click unsubscribe headers. `POST /api/newsletter/unsubscribe` deactivates an address before later queued messages are sent. Public subscriber listing and deletion are unavailable.

Authenticated admin endpoints under `/api/admin/newsletter` provide subscriber listing, detail, invitation, email change, confirmation resend, unsubscribe, and deletion; campaign draft CRUD, queueing to all active subscribers or selected active IDs, and delivery counts. Changing a subscriber email requires confirmation again. Deleting a subscriber anonymizes their address in delivery history. A queued campaign cannot be edited or deleted while sending.

The persistent Node server runs a database-backed worker that sends one message about every two seconds. Delivery results are recorded as sent, failed, or skipped; interrupted sends are marked failed rather than automatically retried to avoid accidental duplicates. Campaign sending requires the existing SMTP settings plus `PUBLIC_SITE_URL` and `PUBLIC_API_URL` in production. These must be the externally reachable HTTPS site and API base URLs. Set `NEWSLETTER_TOKEN_SECRET` to a separate long random value if desired; otherwise unsubscribe links use `JWT_SECRET`. Run the newsletter Prisma migration before restarting the API. If an older Firebase subscriber collection was ever used, do not copy those addresses into active status without confirmed permission.
