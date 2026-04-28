# Deployment Steps

## 1. Prepare the frontend

Open [site-config.js](/c:/Users/usman/OneDrive/Desktop/absuccess/site-config.js:1) and set:

```js
window.SITE_CONFIG = {
  API_BASE_URL: "https://your-render-backend.onrender.com"
};
```

Upload the updated frontend files to Truehost.

## 2. Prepare backend environment

Set these environment variables in Render:

- `PORT`
- `ADMIN_TOKEN`
- `SITE_URL`
- `FRONTEND_ORIGIN`
- `FRONTEND_ORIGINS`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `ADMIN_EMAIL`
- `CONTACT_EMAIL`
- `QUOTE_EMAIL`
- `CAREERS_EMAIL`

## 3. Deploy to Render

1. Push this project to GitHub.
2. Create a new Render web service from the repo.
3. Render should detect [render.yaml](/c:/Users/usman/OneDrive/Desktop/absuccess/render.yaml:1).
4. Add the environment variables above.
5. Deploy.

## 4. Test live flow

Test:

- contact form
- request quote form
- careers form
- CV upload
- admin dashboard at `/admin`

## 5. Important note

This setup is email-only. Render runs the backend, and every form submission is sent straight to your configured email inbox. No database history is stored online in this version.
