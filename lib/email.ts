import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'

export async function sendPasswordResetEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: '【見積取込ツール】パスワードの再設定',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">パスワードの再設定</h2>
        <p>以下のリンクをクリックしてパスワードを再設定してください。</p>
        <a href="${resetUrl}"
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          パスワードを再設定する
        </a>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          このリンクは1時間で有効期限が切れます。<br>
          心当たりがない場合はこのメールを無視してください。
        </p>
      </div>
    `,
  })
}
