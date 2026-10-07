import nodemailer from 'nodemailer';

/** Returns { sendEnquiry(enquiry) }. Does nothing if SMTP isn't configured. */
export function createMailer(mail) {
  if (!mail.host) return { sendEnquiry: async () => {} };

  const transport = nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    secure: mail.port === 465,
    auth: mail.user ? { user: mail.user, pass: mail.pass } : undefined,
  });

  return {
    async sendEnquiry(e) {
      await transport.sendMail({
        from: mail.from,
        to: mail.notifyTo,
        replyTo: e.email,
        subject: `New enquiry: ${e.name}${e.venue ? ` (${e.venue})` : ''}`,
        text: [
          `Name: ${e.name}`,
          `Venue: ${e.venue || '-'}`,
          `Email: ${e.email}`,
          `Interested in: ${e.interest}`,
          `Found via: ${e.findMe || '-'}`,
          '',
          e.message,
        ].join('\n'),
      });
      await transport.sendMail({
        from: mail.from,
        to: e.email,
        subject: 'Thank you for getting in touch',
        text: `Hi ${e.name.split(' ')[0]},\n\nThank you. I will be in touch within two working days.\n\nZaira Christa`,
      });
    },
  };
}
