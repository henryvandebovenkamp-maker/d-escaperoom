// PATH: src/lib/mail/templates/_base.ts
export function wrap(title: string, bodyHtml: string) {
  return `
  <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;background:#fafaf9;color:#0c0a09;padding:24px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden">
      <thead>
        <tr>
          <td style="background:#1c1917;padding:20px 24px;color:#fefce8;font-weight:800;letter-spacing:.04em">
            ${title}
          </td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:24px">${bodyHtml}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td style="padding:16px 24px;font-size:12px;color:#57534e;background:#fafaf9">
            D-EscapeRoom — “The Missing Snack” • Deze e-mail is automatisch gegenereerd.
          </td>
        </tr>
      </tfoot>
    </table>
  </div>`;
}
