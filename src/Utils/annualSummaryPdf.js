import { Platform } from 'react-native';
import RNBlobUtil from 'react-native-blob-util';
import { generatePDF } from 'react-native-html-to-pdf';

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function buildHtml({ year, summary, membershipName, familyCount, propertiesCount, customerName, generatedOn }) {
  const categoryRows = summary.byCategory.length > 0
    ? summary.byCategory.map(cat => `
        <tr>
          <td class="cell">${escapeHtml(cat.name)}</td>
          <td class="cell cell-right">${cat.count}</td>
        </tr>
      `).join('')
    : `<tr><td class="cell" colspan="2">No services recorded yet.</td></tr>`;

  const highlightRows = [
    ['Property visits & services', summary.propertyVisits],
    ['Parent & family care services', summary.parentCare],
    ['Family members on file', familyCount],
    ['Properties managed', propertiesCount],
  ].map(([label, count]) => `
    <tr>
      <td class="cell">${escapeHtml(label)}</td>
      <td class="cell cell-right"><b>${count}</b></td>
    </tr>
  `).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Helvetica, Arial, sans-serif; color: #111827; margin: 0; padding: 32px; }
      h1 { color: #1D4ED8; font-size: 26px; margin: 0 0 4px; }
      .subtitle { color: #6B7280; font-size: 13px; margin: 0 0 24px; }
      .stats { width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-bottom: 28px; table-layout: fixed; }
      .stat-cell { border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px 8px; text-align: center; }
      .stat-value { font-size: 22px; font-weight: bold; color: #111827; }
      .stat-label { font-size: 12px; color: #6B7280; margin-top: 4px; }
      h2 { font-size: 16px; margin: 0 0 12px; }
      table.data { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
      thead td { background: #1D4ED8; color: white; font-weight: bold; padding: 10px 12px; font-size: 13px; }
      .cell { padding: 10px 12px; border-bottom: 1px solid #F1F5F9; font-size: 13px; }
      .cell-right { text-align: right; }
      .footer { color: #9CA3AF; font-size: 12px; margin-top: 20px; }
    </style>
  </head>
  <body>
    <h1>NRI CIRCLE — Annual Summary ${year}</h1>
    <p class="subtitle">Prepared for ${escapeHtml(customerName)} · Generated ${escapeHtml(generatedOn)}</p>

    <table class="stats">
      <tr>
        <td class="stat-cell"><div class="stat-value">${summary.totalRequests}</div><div class="stat-label">Total Requests</div></td>
        <td class="stat-cell"><div class="stat-value">${summary.completed}</div><div class="stat-label">Completed</div></td>
        <td class="stat-cell"><div class="stat-value">$${Math.round(summary.totalSpend).toLocaleString('en-US')}</div><div class="stat-label">Total Spend</div></td>
        <td class="stat-cell"><div class="stat-value">${escapeHtml(membershipName || 'Free')}</div><div class="stat-label">Membership</div></td>
      </tr>
    </table>

    <h2>Services by Category</h2>
    <table class="data">
      <thead><tr><td>Category</td><td style="text-align:right">Services</td></tr></thead>
      <tbody>${categoryRows}</tbody>
    </table>

    <h2>Care Highlights</h2>
    <table class="data">
      <tbody>${highlightRows}</tbody>
    </table>

    <p class="footer">Thank you for trusting NRI Circle with your family and property in India.</p>
  </body>
  </html>
  `;
}

export async function generateAndSaveAnnualSummaryPdf({ year, summary, membershipName, familyCount, propertiesCount, customerName }) {
  const generatedOn = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const html = buildHtml({ year, summary, membershipName, familyCount, propertiesCount, customerName, generatedOn });
  const fileName = `NRI-Circle-Annual-Summary-${year}`;

  const pdf = await generatePDF({ html, fileName, base64: false });

  if (Platform.OS === 'android') {
    const mediaUri = await RNBlobUtil.MediaCollection.copyToMediaStore(
      { name: `${fileName}.pdf`, parentFolder: '', mimeType: 'application/pdf' },
      'Download',
      pdf.filePath
    );
    await RNBlobUtil.android.addCompleteDownload({
      title: `${fileName}.pdf`,
      description: 'Annual summary downloaded from NRI Circle',
      mime: 'application/pdf',
      path: pdf.filePath,
      showNotification: true,
    }).catch(() => {});
    return mediaUri;
  }

  RNBlobUtil.ios.previewDocument(pdf.filePath);
  return pdf.filePath;
}
