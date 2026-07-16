# Deployment Security Headers

This document contains the authoritative security header configuration for
deploying **ply-calc** on each supported static host / CDN. The values in
`vite.config.js` are **development conveniences only** — they do not protect
the shipped application.

## Required Headers

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | `default-src 'self'; style-src 'self'; img-src 'self' data: blob:; script-src 'self';` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

> **Note:** Fonts are self-hosted in `public/fonts.css` (OFL-licensed). No
> external font origins are required in the CSP.

## GitHub Pages

GitHub Pages does not support custom headers natively. Use one of these
approaches:

### Option A: `_redirects` file (limited headers)

Create a root `_redirects` file. This does **not** support all headers, so
prefer Option B for full coverage.

### Option B: Cloudflare Workers (recommended)

If you route the domain through Cloudflare, add a Workers script or use the
Cloudflare dashboard → Rules → Transform rules to inject headers on every
response.

### Option C: Netlify / Vercel rebuild

Consider hosting on Netlify or Vercel instead — both support custom headers
out of the box (see below).

## Netlify

Create a `netlify.toml` at the project root:

```toml
[build]
  publish = "dist"
  command = "npm run build"

[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; style-src 'self'; img-src 'self' data: blob:; script-src 'self';"
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

## Vercel

Create a `vercel.json` at the project root:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; style-src 'self'; img-src 'self' data: blob:; script-src 'self';"
        },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

## Cloudflare Pages

Add the headers via the Cloudflare dashboard:

1. Navigate to **Your Site → Settings → Transformation → Security headers**
2. Enable "Always set security headers"
3. Or use a `_headers` file at the project root:

```
/*
  Content-Security-Policy: default-src 'self'; style-src 'self'; img-src 'self' data: blob:; script-src 'self';
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Referrer-Policy: strict-origin-when-cross-origin
```

## Apache (`.htaccess`)

```apache
<IfModule mod_headers.c>
  Header set Content-Security-Policy "default-src 'self'; style-src 'self'; img-src 'self' data: blob:; script-src 'self';"
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "DENY"
  Header set Strict-Transport-Security "max-age=31536000; includeSubDomains" env=HTTPS
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
```

## Nginx

```nginx
server {
    # ... other config ...

    add_header Content-Security-Policy "default-src 'self'; style-src 'self'; img-src 'self' data: blob:; script-src 'self';" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

## Verifying Headers

After deploying, verify the headers are present:

```bash
curl -I https://your-domain.com
```

Or use an online tool such as [securityheaders.com](https://securityheaders.com).

## HSTS Preload (Optional)

For maximum protection against SSL stripping, consider submitting your domain
to the [HSTS Preload List](https://hstspreload.org/). This requires:

1. `Strict-Transport-Security` header with `max-age` ≥ 31536000
2. `includeSubDomains` directive present
3. Valid HTTPS on all subdomains
4. **Warning:** Once preloaded, removal is extremely difficult.