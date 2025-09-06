const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'strongtechman@gmail.com',
    pass: 'mmls igfm lyis igtr'  // NOT your regular Gmail password
  }
});

async function sendEmail({ from, to, title, content, category, priority }) {
  const mailOptions = {
    from,
    to,
    subject: title,
    text: content,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Mail sent:', info);
  } catch (err) {
    console.error("Error:", error);
  }
}

module.exports = { sendEmail }