export function gradeChangeEmailHtml(changes: {
  courseCode: string
  courseName: string
  oldScore: number | null
  newScore: number
}[]) {
  const rows = changes.map(c => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #1e2a3a;font-weight:600;color:#00d4ff">${c.courseCode}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1e2a3a;color:#c8d0e0">${c.courseName}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1e2a3a;color:#888">${c.oldScore !== null ? c.oldScore + '%' : '—'}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1e2a3a;font-weight:700;color:#00ff9f">${c.newScore}%</td>
    </tr>
  `).join('')

  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"/></head>
      <body style="margin:0;padding:0;background:#0a0b10;font-family:Arial,sans-serif">
        <div style="max-width:560px;margin:40px auto;background:#0f1117;border:1px solid #1e2a3a;border-radius:12px;overflow:hidden">
          
          <div style="background:linear-gradient(135deg,#0f1117 0%,#1a1f2e 100%);padding:32px;border-bottom:1px solid #1e2a3a">
            <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">
              📊 OPIT Tracker
            </div>
            <div style="font-size:13px;color:#555f7a;margin-top:4px">Grade Update Notification</div>
          </div>

          <div style="padding:28px 32px">
            <p style="margin:0 0 8px;font-size:15px;color:#c8d0e0">
              Your grades have been updated:
            </p>
            <p style="margin:0 0 24px;font-size:13px;color:#555f7a">
              The following changes were detected during your last sync.
            </p>

            <table style="width:100%;border-collapse:collapse;background:#0a0b10;border-radius:8px;overflow:hidden;border:1px solid #1e2a3a">
              <thead>
                <tr style="background:#1e2a3a">
                  <th style="padding:10px 16px;text-align:left;font-size:11px;color:#555f7a;text-transform:uppercase;letter-spacing:0.5px">Course</th>
                  <th style="padding:10px 16px;text-align:left;font-size:11px;color:#555f7a;text-transform:uppercase;letter-spacing:0.5px">Name</th>
                  <th style="padding:10px 16px;text-align:left;font-size:11px;color:#555f7a;text-transform:uppercase;letter-spacing:0.5px">Before</th>
                  <th style="padding:10px 16px;text-align:left;font-size:11px;color:#555f7a;text-transform:uppercase;letter-spacing:0.5px">Now</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <div style="margin-top:28px">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}" 
                 style="display:inline-block;background:#00d4ff;color:#0a0b10;font-weight:700;font-size:13px;padding:10px 22px;border-radius:6px;text-decoration:none">
                View Dashboard →
              </a>
            </div>
          </div>

          <div style="padding:20px 32px;border-top:1px solid #1e2a3a;font-size:11px;color:#333d4f">
            OPIT Tracker · Developed by Juan M. Aguilar · 
            <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color:#00d4ff;text-decoration:none">study-dashboard-fpy7.vercel.app</a>
          </div>
        </div>
      </body>
    </html>
  `
}