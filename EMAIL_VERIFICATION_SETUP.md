# Email Verification Setup Guide

This guide explains how to set up email verification for the Franchise Simulator app.

## How It Works

1. User registers with email and password
2. System creates unverified user account
3. Verification email is sent with a unique link
4. User clicks link to verify email
5. Account is activated and user can log in

## Email Provider Options

### Option 1: Resend (Recommended for Production)

Resend is the easiest and most reliable option for production.

1. Sign up at https://resend.com
2. Get your API key
3. Add to backend `.env`:
   ```
   RESEND_API_KEY=re_your_api_key
   FROM_EMAIL=onboarding@yourdomain.com
   ```

4. Verify your domain in Resend dashboard (for production)

### Option 2: SendGrid

1. Sign up at https://sendgrid.com
2. Create an API key
3. Add to backend `.env`:
   ```
   SENDGRID_API_KEY=SG.your_api_key
   FROM_EMAIL=noreply@yourdomain.com
   ```

### Option 3: Gmail (Testing Only)

Not recommended for production due to rate limits.

1. Enable 2-factor authentication on your Google account
2. Generate an App Password at https://myaccount.google.com/apppasswords
3. Add to backend `.env`:
   ```
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-char-app-password
   FROM_EMAIL=your-email@gmail.com
   ```

### Option 4: Ethereal (Development Only)

Ethereal provides fake email accounts for testing.

1. Visit https://ethereal.email
2. Create a free account
3. Add credentials to backend `.env`:
   ```
   ETHEREAL_USER=username@ethereal.email
   ETHEREAL_PASS=your-password
   FROM_EMAIL=test@example.com
   ```

4. Check emails at the Ethereal dashboard URL shown in console logs

## Environment Variables

Required backend environment variables:

```env
# Server
PORT=8787
JWT_SECRET=your-secret-key
FRONTEND_URL=https://your-app.vercel.app

# Database
DATABASE_URL=postgresql://...

# Email (pick one provider)
RESEND_API_KEY=re_xxx
# or
SENDGRID_API_KEY=SG.xxx
# or
GMAIL_USER=xxx
GMAIL_APP_PASSWORD=xxx

# Email settings
FROM_EMAIL=noreply@yourdomain.com
APP_NAME=Franchise Simulator
```

## Frontend Environment

```env
VITE_API_URL=https://your-backend-url.com
```

## API Endpoints

### POST /api/auth/register
Creates a new unverified user and sends verification email.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "email": "user@example.com",
  "requiresVerification": true
}
```

### GET /api/auth/verify-email?token=xxx
Verifies the email address.

**Success Response:**
```json
{
  "message": "Email verified successfully!",
  "token": "jwt-token",
  "user": { ... }
}
```

### POST /api/auth/resend-verification
Resends the verification email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

### POST /api/auth/login
Logs in a verified user.

**Error for unverified email:**
```json
{
  "error": "Email not verified",
  "needsVerification": true,
  "email": "user@example.com"
}
```

## User Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Register  │────▶│ Check Email │────▶│ Click Link  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                                                ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Dashboard  │◀────│  Auto Login │◀────│   Verified  │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Testing Email Verification

### Using Ethereal (Development)

1. Set up Ethereal credentials in `.env`
2. Register a new account
3. Check the console for the preview URL
4. Open the URL to view the verification email
5. Click the verification link

### Using Resend (Production)

1. Set up Resend API key
2. Register with a real email address
3. Check your inbox for the verification email
4. Click the link to verify

## Troubleshooting

### Emails not sending
- Check email provider credentials
- Verify `FROM_EMAIL` is authorized with your provider
- Check server logs for error messages

### Verification link not working
- Ensure `FRONTEND_URL` matches your actual frontend URL
- Check that the token hasn't expired (24 hours)
- Verify the backend is properly deployed

### Database errors
- Ensure database migrations have run
- Check `DATABASE_URL` is correct
- Verify `email_verified` column exists in users table

## Security Considerations

- Verification tokens expire after 24 hours
- Tokens are single-use
- Passwords are hashed with bcrypt
- JWT tokens expire after 7 days
- Unverified users cannot access protected routes
