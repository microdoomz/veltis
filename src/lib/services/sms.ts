import twilio from 'twilio';

export async function sendAuthSMS(toPhone: string, code: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromPhone) {
    console.warn('[Veltis SMS] Twilio credentials or phone number not configured, skipping SMS delivery.');
    console.log(`[Veltis SMS] To: ${toPhone} | Code: ${code}`);
    return;
  }

  const twilioClient = twilio(accountSid, authToken);

  try {
    const message = `Your Veltis verification code is: ${code}. Do not share this with anyone.`;
    
    await twilioClient.messages.create({
      body: message,
      from: fromPhone,
      to: toPhone,
    });
  } catch (error) {
    console.error(`[Veltis SMS] Failed to send SMS to ${toPhone}:`, error);
    // Don't throw to prevent breaking the auth flow for users, but log heavily.
  }
}
