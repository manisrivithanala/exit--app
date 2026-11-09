// server.js — FCM Push + Email Exit Pass Notification Server
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

dotenv.config();

const serviceAccount = JSON.parse(
  readFileSync('./serviceAccount.json', 'utf-8')
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const messaging = getMessaging();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// ─── Email Transporter Setup ───
let etherealAccount = null;

async function getEmailTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

  // 1. Live SMTP credentials if provided
  if (SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST || 'smtp.gmail.com',
      port: Number(SMTP_PORT) || 587,
      secure: SMTP_SECURE === 'true',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });
  }

  // 2. Development Ethereal account for testing
  if (!etherealAccount) {
    try {
      etherealAccount = await nodemailer.createTestAccount();
      console.log('📬 Initialized Ethereal test mail account:', etherealAccount.user);
    } catch (e) {
      console.warn('⚠️ Ethereal account creation failed, fallback to JSON transport:', e.message);
      return nodemailer.createTransport({ jsonTransport: true });
    }
  }

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: etherealAccount.user,
      pass: etherealAccount.pass
    }
  });
}

// ─── Email Template Builders ───
function buildApprovedEmailHtml({
  fullName,
  regNo,
  branch,
  year,
  permissionId,
  exitToken,
  outTime,
  date,
  destination,
  reason,
  officerName,
  officerRole,
  slipUrl
}) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Official Campus Exit Pass</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 30px 15px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #0a3e5e 0%, #0d4f78 60%, #0284c7 100%); padding: 32px 30px; text-align: center; color: #ffffff;">
                <div style="display: inline-block; width: 56px; height: 56px; background: rgba(255,255,255,0.18); border-radius: 16px; line-height: 56px; font-size: 28px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.3);">
                  🎓
                </div>
                <h1 style="margin: 0 0 6px; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">College Permission System</h1>
                <p style="margin: 0; font-size: 13px; color: #bae6fd; font-weight: 500;">Official Campus Gate Pass Clearance</p>
              </td>
            </tr>

            <!-- Status Banner -->
            <tr>
              <td style="padding: 24px 30px 10px; text-align: center;">
                <span style="display: inline-block; background-color: #dcfce7; color: #15803d; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 6px 16px; border-radius: 20px; border: 1px solid #bbf7d0;">
                  ✅ Permission Approved
                </span>
                <h2 style="margin: 16px 0 6px; font-size: 20px; color: #0a3e5e; font-weight: 700;">Your Exit Pass Is Ready</h2>
                <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.5;">
                  Hello <strong>${escapeHtml(fullName)}</strong>, your request has been verified and granted final approval.
                </p>
              </td>
            </tr>

            <!-- Exit Pass Token Box -->
            <tr>
              <td style="padding: 10px 30px 24px;">
                <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 24px 20px; text-align: center; border: 2px solid #38bdf8; box-shadow: 0 8px 25px rgba(2, 132, 199, 0.25);">
                  <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2.5px; color: #7dd3fc; font-weight: 700; margin-bottom: 8px;">
                    🛡️ Official Security Gate Exit Token
                  </div>
                  <div style="font-size: 32px; font-weight: 800; letter-spacing: 4px; color: #38bdf8; font-family: 'Courier New', Courier, monospace; margin: 4px 0 10px; word-break: break-all;">
                    ${escapeHtml(exitToken || 'GRANTED')}
                  </div>
                  <div style="display: inline-block; background: rgba(56, 189, 248, 0.15); color: #bae6fd; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 8px;">
                    Pass ID: <strong>${escapeHtml(permissionId)}</strong>
                  </div>
                </div>
              </td>
            </tr>

            <!-- Details Card -->
            <tr>
              <td style="padding: 0 30px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden;">
                  <tr>
                    <td colspan="2" style="background-color: #e2e8f0; padding: 10px 16px; font-size: 12px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">
                      Pass Details
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0; width: 40%;">Student Name</td>
                    <td style="padding: 12px 16px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${escapeHtml(fullName)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Register Number</td>
                    <td style="padding: 12px 16px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${escapeHtml(regNo)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Branch & Year</td>
                    <td style="padding: 12px 16px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${escapeHtml(branch || '--')} · ${escapeHtml(year || '--')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Departure Date & Time</td>
                    <td style="padding: 12px 16px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${escapeHtml(date || '--')} at ${escapeHtml(outTime || '--')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Destination & Purpose</td>
                    <td style="padding: 12px 16px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${escapeHtml(destination || '--')} (${escapeHtml(reason || '--')})</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b;">Approved By</td>
                    <td style="padding: 12px 16px; font-size: 13px; color: #15803d; font-weight: 700;">${escapeHtml(officerName || 'Head of Department')} (${escapeHtml(officerRole || 'HOD')})</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Call to Action -->
            <tr>
              <td style="padding: 0 30px 24px; text-align: center;">
                <a href="${slipUrl || '#'}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 8px 20px rgba(2, 132, 199, 0.35);">
                  📱 View & Download QR Slip
                </a>
              </td>
            </tr>

            <!-- Gate Instruction Notice -->
            <tr>
              <td style="padding: 0 30px 30px;">
                <div style="background-color: #f0fdf4; border: 1.5px dashed #86efac; border-radius: 12px; padding: 14px 18px; color: #166534; font-size: 12px; line-height: 1.6;">
                  <strong>Gate Instructions:</strong> Show this email containing the <strong>Exit Token (${escapeHtml(exitToken)})</strong> or present your digital QR pass at the security gate. The security officer will log your departure timestamp.
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center; color: #94a3b8; font-size: 11px;">
                This is an automated security clearance notification from the College Permission System.<br>
                Please do not reply to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

function buildRejectedEmailHtml({
  fullName,
  regNo,
  permissionId,
  destination,
  reason,
  officerName,
  officerRole,
  rejectionReason
}) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Permission Request Update</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 30px 15px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08); border: 1px solid #fecaca;">
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 60%, #dc2626 100%); padding: 32px 30px; text-align: center; color: #ffffff;">
                <div style="display: inline-block; width: 56px; height: 56px; background: rgba(255,255,255,0.18); border-radius: 16px; line-height: 56px; font-size: 28px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.3);">
                  🚫
                </div>
                <h1 style="margin: 0 0 6px; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">College Permission System</h1>
                <p style="margin: 0; font-size: 13px; color: #fecaca; font-weight: 500;">Permission Status Notification</p>
              </td>
            </tr>

            <!-- Status Banner -->
            <tr>
              <td style="padding: 26px 30px 10px; text-align: center;">
                <span style="display: inline-block; background-color: #fee2e2; color: #b91c1c; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 6px 16px; border-radius: 20px; border: 1px solid #fca5a5;">
                  ❌ Permission Request Denied
                </span>
                <h2 style="margin: 16px 0 6px; font-size: 20px; color: #991b1b; font-weight: 700;">Request Not Approved</h2>
                <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.5;">
                  Hello <strong>${escapeHtml(fullName)}</strong>, your exit permission request (<strong>${escapeHtml(permissionId)}</strong>) has been reviewed and declined.
                </p>
              </td>
            </tr>

            <!-- Rejection Reason Highlight Box -->
            <tr>
              <td style="padding: 16px 30px;">
                <div style="background-color: #fff1f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 18px 20px; color: #991b1b;">
                  <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #b91c1c; font-weight: 800; margin-bottom: 6px;">
                    Reason Given by Authority
                  </div>
                  <div style="font-size: 15px; font-weight: 600; line-height: 1.5; color: #7f1d1d;">
                    "${escapeHtml(rejectionReason || 'Permission not granted at this time.')}"
                  </div>
                </div>
              </td>
            </tr>

            <!-- Summary Table -->
            <tr>
              <td style="padding: 0 30px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden;">
                  <tr>
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0; width: 40%;">Register Number</td>
                    <td style="padding: 12px 16px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${escapeHtml(regNo)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Requested Destination</td>
                    <td style="padding: 12px 16px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${escapeHtml(destination || '--')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Stated Purpose</td>
                    <td style="padding: 12px 16px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${escapeHtml(reason || '--')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b;">Reviewed By</td>
                    <td style="padding: 12px 16px; font-size: 13px; color: #b91c1c; font-weight: 700;">${escapeHtml(officerName || 'Faculty / HOD')} (${escapeHtml(officerRole || 'Staff')})</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Guidance Note -->
            <tr>
              <td style="padding: 0 30px 30px;">
                <div style="background-color: #f1f5f9; border-radius: 12px; padding: 14px 18px; color: #475569; font-size: 12px; line-height: 1.6;">
                  ℹ️ <strong>Next Steps:</strong> If you believe this decision was made in error or have an urgent situation, please approach your class proctor or department head directly.
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center; color: #94a3b8; font-size: 11px;">
                This is an automated clearance notification from the College Permission System.<br>
                Please do not reply to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── Main Web Portal & Static Fallback ───
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: '.' });
});

// ─── Server info endpoint (browser test) ───
app.get('/api/server-info', (req, res) => {
  res.send(`
    <div style="font-family:sans-serif; max-width:600px; margin:40px auto; padding:20px; border:1px solid #e2e8f0; border-radius:12px;">
      <h1>🚀 College Permission Notification Server</h1>
      <p>FCM Push & Email Notification Service: <strong style="color:green">LIVE</strong></p>
      <p>Time: ${new Date().toISOString()}</p>
      <hr>
      <h3>Available Endpoints:</h3>
      <ul>
        <li><a href="/api/health">GET /api/health</a></li>
        <li><code>POST /api/send-push</code> (FCM Push)</li>
        <li><code>POST /api/send-email</code> (Exit Pass Token & Rejection Email)</li>
      </ul>
    </div>
  `);
});

// ─── Health check ───
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ─── Send Push (FCM) ───
app.post('/api/send-push', async (req, res) => {
  const { userId, title, body, link } = req.body;
  if (!userId || !title) {
    return res.status(400).json({ error: 'userId and title required' });
  }

  try {
    const collections = ['students', 'teachers', 'hods', 'security'];
    let token = null;
    let foundIn = null;

    for (const col of collections) {
      const docSnap = await db.collection(col).doc(userId).get();
      if (docSnap.exists && docSnap.data()?.fcmToken) {
        token = docSnap.data().fcmToken;
        foundIn = col;
        break;
      }
    }

    if (!token) {
      console.log('❌ No FCM token for', userId);
      return res.status(404).json({ error: 'No FCM token for ' + userId });
    }

    await messaging.send({
      token,
      notification: { title, body: body || '' },
      webpush: {
        notification: {
          icon: 'https://cdn-icons-png.flaticon.com/512/2991/2991112.png',
          badge: 'https://cdn-icons-png.flaticon.com/512/2991/2991112.png',
          vibrate: [200, 100, 200, 100, 200]
        },
        fcmOptions: { link: link || '/' }
      },
      data: { url: link || '/', title, body: body || '' }
    });

    console.log(`✅ Push sent to ${userId} (${foundIn}) | ${title}`);
    res.json({ success: true });
  } catch (e) {
    console.error('❌ Push failed:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Send Email (Exit Pass Token & Rejection) ───
app.post('/api/send-email', async (req, res) => {
  const {
    to,
    type, // 'approved' | 'rejected'
    subject,
    fullName,
    regNo,
    branch,
    year,
    permissionId,
    exitToken,
    outTime,
    date,
    destination,
    reason,
    officerName,
    officerRole,
    rejectionReason,
    slipUrl
  } = req.body;

  if (!to) {
    return res.status(400).json({ error: 'Target email "to" is required' });
  }

  try {
    const transporter = await getEmailTransporter();
    const fromAddress = process.env.EMAIL_FROM || '"College Exit Pass System" <noreply@bvcits.edu.in>';

    let emailSubject = subject;
    let htmlContent = '';

    if (type === 'approved') {
      emailSubject = emailSubject || `🎓 Exit Pass Approved — Token: ${exitToken || permissionId}`;
      htmlContent = buildApprovedEmailHtml({
        fullName,
        regNo,
        branch,
        year,
        permissionId,
        exitToken,
        outTime,
        date,
        destination,
        reason,
        officerName,
        officerRole: officerRole || 'HOD',
        slipUrl: slipUrl || `${process.env.BASE_APP_URL || 'http://localhost:5500'}/student/permission-slip.html?id=${permissionId}`
      });
    } else {
      emailSubject = emailSubject || `❌ Permission Request Denied — ${permissionId}`;
      htmlContent = buildRejectedEmailHtml({
        fullName,
        regNo,
        permissionId,
        destination,
        reason,
        officerName,
        officerRole: officerRole || 'Teacher / HOD',
        rejectionReason: rejectionReason || 'Permission request not granted.'
      });
    }

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: emailSubject,
      html: htmlContent
    });

    let previewUrl = null;
    if (nodemailer.getTestMessageUrl) {
      previewUrl = nodemailer.getTestMessageUrl(info);
    }

    console.log(`📧 Email sent to ${to} [${type}]:`, info.messageId);
    if (previewUrl) {
      console.log(`🔗 Ethereal Email Preview: ${previewUrl}`);
    }

    res.json({
      success: true,
      messageId: info.messageId,
      previewUrl,
      type,
      to
    });
  } catch (err) {
    console.error('❌ Email sending failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 College Permission Server running at http://localhost:${PORT}`);
  console.log(`📬 FCM Push & Email Exit Pass services ready.`);
});