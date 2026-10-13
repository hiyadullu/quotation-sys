import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';
import { serviceUnavailable } from '../lib/errors';
import { logger } from '../lib/logger';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!env.smtpConfigured) {
    throw serviceUnavailable('Email is not configured yet. Add the SMTP_* settings to your .env file.');
  }
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  attachments: { filename: string; content: Buffer; contentType: string }[];
}

export async function sendMail(mail: OutgoingMail): Promise<void> {
  try {
    await getTransporter().sendMail({ from: env.MAIL_FROM, ...mail });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) throw err; // already an AppError
    logger.error({ err }, 'Email delivery failed');
    throw serviceUnavailable('The email could not be sent. Check your SMTP settings and try again.');
  }
}
