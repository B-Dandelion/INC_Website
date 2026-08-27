This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Member review notification email

The admin member-review workflow can send approval or rejection result emails through Resend. Configure these environment variables in the deployment environment:

```bash
RESEND_API_KEY=
MEMBER_REVIEW_EMAIL_FROM=
MEMBER_REVIEW_REPLY_TO= # optional
NEXT_PUBLIC_SITE_URL=https://inc-kings.vercel.app
```

If Resend is not configured or delivery fails, the member review state is still saved. The admin member detail shows the notification status and supports retrying the result email.

For Supabase Auth email confirmation, keep the hosted project's Auth URL Configuration aligned with the public site. The production Site URL should be `https://inc-kings.vercel.app`; add any Vercel preview URLs to the allowed redirect list only when preview email-confirmation testing is needed.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out the [Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
