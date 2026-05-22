import nodemailer from 'nodemailer';

// Create transporter based on environment variables
function createTransporter() {
  // Use Resend if API key is available (recommended for production)
  if (process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    });
  }

  // Use SendGrid if API key is available
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }

  // Use Gmail if configured
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  // Ethereal for testing (development only)
  console.log('No email service configured. Using Ethereal for testing...');
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: process.env.ETHEREAL_USER,
      pass: process.env.ETHEREAL_PASS,
    },
  });
}

const transporter = createTransporter();

export async function sendVerificationEmail(email, token, frontendUrl) {
  const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
  
  const fromEmail = process.env.FROM_EMAIL || 'noreply@franchisesimulator.com';
  const appName = process.env.APP_NAME || 'Franchise Simulator';

  const mailOptions = {
    from: `"${appName}" <${fromEmail}>`,
    to: email,
    subject: `Verify your email for ${appName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1;">Welcome to ${appName}!</h2>
        <p>Thank you for creating an account. Please verify your email address to start using the app.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background: linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%); 
                    color: white; 
                    padding: 14px 28px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: 600;
                    display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Or copy and paste this link into your browser:<br>
          <a href="${verificationUrl}" style="color: #6366f1;">${verificationUrl}</a>
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `
Welcome to ${appName}!

Thank you for creating an account. Please verify your email address to start using the app.

Click the link below to verify your email:
${verificationUrl}

This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    
    // If using Ethereal, log the preview URL
    if (info.ethereal) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw error;
  }
}

export async function sendWelcomeEmail(email, frontendUrl) {
  const fromEmail = process.env.FROM_EMAIL || 'noreply@franchisesimulator.com';
  const appName = process.env.APP_NAME || 'Franchise Simulator';

  const mailOptions = {
    from: `"${appName}" <${fromEmail}>`,
    to: email,
    subject: `Welcome to ${appName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1;">Your email is verified!</h2>
        <p>Thank you for verifying your email address. Your account is now active and you can start using ${appName}.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${frontendUrl}" 
             style="background: linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%); 
                    color: white; 
                    padding: 14px 28px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: 600;
                    display: inline-block;">
            Start Simulating
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          With your free account, you can:<br>
          • Save up to 3 simulation scenarios<br>
          • Generate basic AI reports<br>
          • Compare different franchise options
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
          Upgrade to Pro anytime for unlimited saves and detailed analysis!
        </p>
      </div>
    `,
    text: `
Your email is verified!

Thank you for verifying your email address. Your account is now active and you can start using ${appName}.

Visit ${frontendUrl} to start simulating.

With your free account, you can:
- Save up to 3 simulation scenarios
- Generate basic AI reports
- Compare different franchise options

Upgrade to Pro anytime for unlimited saves and detailed analysis!
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Don't throw - welcome email is not critical
    return { success: false, error: error.message };
  }
}
