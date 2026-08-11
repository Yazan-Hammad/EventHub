const nodemailer = require('nodemailer');

// Lazily creates a free Ethereal test SMTP account on first use and reuses it for
// the life of the process — no real credentials needed. Nothing lands in a real
// inbox; instead sendOtpEmail() returns a preview URL where the email can be read.
let transporterPromise;

function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = nodemailer.createTestAccount().then((account) =>
      nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: { user: account.user, pass: account.pass },
      })
    );
  }
  return transporterPromise;
}

async function sendOtpEmail(email, code) {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: '"EventHub" <no-reply@eventhub.test>',
    to: email,
    subject: 'Your EventHub verification code',
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
  });
  return { previewUrl: nodemailer.getTestMessageUrl(info) || null };
}

module.exports = { sendOtpEmail };
