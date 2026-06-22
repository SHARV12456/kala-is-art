// ============================================================
// KALA IS ART — PDF Service (New Architecture)
// Write-to-disk → Validate → Stream → Cleanup
// ============================================================
'use strict';

const PDFDocument = require('pdfkit');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { randomUUID } = require('crypto');
const logger = require('../config/logger');

// ─── PALETTE (Ultra-Minimalist Luxury) ──────────────────────
const C = {
  DARK: '#1A1A1A',
  MUTED: '#808080',
  LIGHT: '#B3B3B3',
  ACCENT: '#C1AA84',     // Soft Beige Gold
  BORDER: '#F0F0F0',     // Extremely faint separator lines
  SURFACE: '#FFFFFF',
};

// ─── HELPERS ──────────────────────────────────────────────────
function inr(amount) {
  return 'RS ' + Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(date) {
  if (!date) return '\u2014';
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch { return '\u2014'; }
}

// ─── CORE: generate PDF buffer ────────────────────────────────
function buildPDFBuffer(estimate) {
  return new Promise((resolve, reject) => {
    const { items = [], ...est } = estimate;

    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      bufferPages: true,
      info: {
        Title:   `Estimate ${est.estimate_number || ''}`,
        Author:  est.business_name || 'Kala Is Art',
        Subject: 'Client Estimate',
      },
    });

    const chunks = [];
    doc.on('data',  (c) => chunks.push(c));
    doc.on('end',   ()  => resolve(Buffer.concat(chunks)));
    doc.on('error', (e) => reject(e));

    const W   = doc.page.width;   // 595.28
    const H   = doc.page.height;  // 841.89
    const PAD = 50;

    let y = 60; // Deep top padding for elegance

    // ── 1. CENTERED EDITORIAL HEADER ────────────────────────
    doc.font('Helvetica')
       .fontSize(22)
       .fillColor(C.DARK)
       .text((est.business_name || 'KALA IS ART').toUpperCase(), 0, y, { align: 'center', width: W, characterSpacing: 6 });

    y += 28;
    const taglineTxt = (est.brand_tagline || 'Handcraft, Art & Creative Studio.');
    doc.font('Times-Italic')
       .fontSize(10)
       .fillColor(C.MUTED)
       .text(taglineTxt, 0, y, { align: 'center', width: W, characterSpacing: 1 });

    y += 24;
    const contactLine = ['kalaisart7@gmail.com', '+91- 9820689117'].join('      ');
    doc.font('Helvetica').fontSize(8).fillColor(C.LIGHT)
       .text(contactLine, 0, y, { align: 'center', width: W, characterSpacing: 1 });

    y += 40;
    
    // Very soft separator
    doc.moveTo(W/2 - 100, y).lineTo(W/2 + 100, y).lineWidth(0.5).strokeColor(C.ACCENT).stroke();
    
    y += 30;

    // ── 2. META DATA (Minimal Grid) ─────────────────────────
    doc.font('Helvetica').fontSize(9).fillColor(C.MUTED)
       .text('PROSPECTUS NO.', PAD, y, { characterSpacing: 1 });
    doc.font('Helvetica').fontSize(9).fillColor(C.DARK)
       .text(est.estimate_number || '—', PAD, y + 14);

    doc.font('Helvetica').fontSize(9).fillColor(C.MUTED)
       .text('DATE', PAD + 140, y, { characterSpacing: 1 });
    doc.font('Helvetica').fontSize(9).fillColor(C.DARK)
       .text(fmtDate(est.created_at), PAD + 140, y + 14);

    doc.font('Helvetica').fontSize(9).fillColor(C.MUTED)
       .text('PREPARED FOR', PAD + 280, y, { characterSpacing: 1 });
    doc.font('Helvetica').fontSize(9).fillColor(C.DARK)
       .text(est.client_name || '—', PAD + 280, y + 14);

    y += 50;

    // ── 3. SCOPE OVERVIEW ───────────────────────────────────
    if (est.scope_of_work) {
      doc.font('Times-Italic').fontSize(11).fillColor(C.DARK)
         .text(String(est.scope_of_work), PAD, y, { width: W - PAD * 2, lineGap: 6, align: 'center' });
      
      y += doc.heightOfString(String(est.scope_of_work), { width: W - PAD * 2, fontSize: 11, lineGap: 6 }) + 40;
    }

    // ── 4. AIRY TABLE ───────────────────────────────────────
    const tableW = W - PAD * 2;
    const COL = {
      desc: { x: PAD,               w: tableW * 0.50 },
      qty:  { x: PAD + tableW*0.50, w: tableW * 0.15 },
      rate: { x: PAD + tableW*0.65, w: tableW * 0.15 },
      amt:  { x: PAD + tableW*0.80, w: tableW * 0.20 },
    };

    const tHY = y;
    doc.font('Helvetica').fontSize(8).fillColor(C.MUTED);
    doc.text('DESCRIPTION', COL.desc.x, tHY, { characterSpacing: 1 });
    doc.text('QTY',         COL.qty.x, tHY, { align: 'center', width: COL.qty.w, characterSpacing: 1 });
    doc.text('RATE',        COL.rate.x, tHY, { align: 'right', width: COL.rate.w, characterSpacing: 1 });
    doc.text('AMOUNT',      COL.amt.x, tHY, { align: 'right', width: COL.amt.w, characterSpacing: 1 });

    y += 20;
    doc.moveTo(PAD, y).lineTo(W - PAD, y).lineWidth(0.5).strokeColor(C.BORDER).stroke();
    y += 20;

    if (items.length === 0) {
      doc.font('Times-Italic').fontSize(10).fillColor(C.LIGHT)
         .text('No items specified.', PAD, y, { align: 'center', width: tableW });
      y += 60;
    } else {
      items.forEach((item) => {
        const amount   = parseFloat(item.quantity || 0) * parseFloat(item.unit_rate || 0);
        const descTxt  = String(item.description || '');
        const matTxt   = item.material_description ? String(item.material_description) : '';
        
        const dH = doc.heightOfString(descTxt, { width: COL.desc.w - 16, fontSize: 10, lineGap: 4 });
        const mH = matTxt ? doc.heightOfString(matTxt, { width: COL.desc.w - 16, fontSize: 8, lineGap: 2 }) : 0;
        const rowH = dH + (matTxt ? mH + 6 : 0) + 20;

        // Description
        doc.font('Helvetica').fontSize(10).fillColor(C.DARK)
           .text(descTxt, COL.desc.x, y, { width: COL.desc.w - 16, lineGap: 4 });
        if (matTxt) {
          doc.font('Times-Italic').fontSize(9).fillColor(C.MUTED)
             .text(matTxt, COL.desc.x, y + dH + 2, { width: COL.desc.w - 16, lineGap: 2 });
        }

        // Qty
        doc.font('Helvetica').fontSize(10).fillColor(C.DARK)
           .text(`${item.quantity} ${item.unit || ''}`, COL.qty.x, y, { align: 'center', width: COL.qty.w });

        // Rate
        doc.font('Helvetica').fontSize(10).fillColor(C.DARK)
           .text(inr(item.unit_rate), COL.rate.x, y, { align: 'right', width: COL.rate.w });

        // Amount
        doc.font('Helvetica').fontSize(10).fillColor(C.DARK)
           .text(inr(amount), COL.amt.x, y, { align: 'right', width: COL.amt.w });

        y += rowH;
      });
      y += 10;
      doc.moveTo(PAD, y).lineTo(W - PAD, y).lineWidth(0.5).strokeColor(C.BORDER).stroke();
      y += 20;
    }

    // ── 5. ELEGANT TOTALS ───────────────────────────────────
    const tW = 200;
    const tX = W - PAD - tW;
    
    let rowY = y;
    
    const printTot = (label, val, isTotal) => {
      doc.font('Helvetica').fontSize(isTotal ? 11 : 9).fillColor(isTotal ? C.DARK : C.MUTED)
         .text(label, tX, rowY, { characterSpacing: 1 });
      doc.font('Helvetica').fontSize(isTotal ? 11 : 9).fillColor(C.DARK)
         .text(val, tX, rowY, { align: 'right', width: tW });
      rowY += isTotal ? 30 : 20;
    };

    printTot('SUBTOTAL', inr(est.subtotal), false);
    if (parseFloat(est.discount_amount || 0) > 0) {
      printTot('DISCOUNT', `\u2212 ${inr(est.discount_amount)}`, false);
    }
    printTot(`GST (${est.gst_percentage || 18}%)`, inr(est.gst_amount), false);
    
    rowY += 10;
    doc.moveTo(tX, rowY - 10).lineTo(W - PAD, rowY - 10).lineWidth(0.5).strokeColor(C.ACCENT).stroke();
    printTot('GRAND TOTAL', inr(est.grand_total), true);

    y = Math.max(rowY + 20, y + 60);

    // ── 6. NOTES & TERMS ────────────────────────────────────
    if (est.notes && String(est.notes).trim()) {
      doc.font('Helvetica').fontSize(8).fillColor(C.MUTED)
         .text('NOTES', PAD, y, { characterSpacing: 1 });
      y += 16;
      doc.font('Times-Roman').fontSize(9).fillColor(C.DARK)
         .text(String(est.notes).trim(), PAD, y, { width: W - PAD * 2 - tW - 40, lineGap: 4 });
      y += doc.heightOfString(String(est.notes).trim(), { width: W - PAD * 2 - tW - 40, fontSize: 9, lineGap: 4 }) + 30;
    }

    const termsTxt = est.terms && String(est.terms).trim() ? String(est.terms).trim() : 
      "1. This estimate is valid for 15 days from the date of issue unless otherwise specified.\n" +
      "2. Material selection, finishes, dimensions, and specifications are subject to final approval before order confirmation.\n" +
      "3. Production, procurement, and execution timelines commence only after receipt of the agreed advance payment and final approvals.\n" +
      "4. Any modifications, additions, or scope changes requested after approval may result in revised pricing and timelines.\n" +
      "5. Natural variations in stone, wood, metal, fabric, artwork, and handcrafted materials are inherent characteristics and shall not be considered defects.\n" +
      "6. Ownership of all designs, concepts, drawings, and creative work remains with Kala Is Art until full payment is received.\n" +
      "7. Payment milestones shall be strictly adhered to as per the agreed commercial terms. Delays may impact project timelines.\n" +
      "8. This estimate is confidential and intended solely for the named client and project.";

    doc.font('Helvetica').fontSize(8).fillColor(C.MUTED)
       .text('TERMS & CONDITIONS', PAD, y, { characterSpacing: 1 });
    y += 16;
    doc.font('Helvetica').fontSize(8).fillColor(C.DARK)
       .text(termsTxt, PAD, y, { width: W - PAD * 2, lineGap: 4 });

    // ── 7. EDITORIAL FOOTER ─────────────────────────────────
    const footY = H - 50;
    
    doc.moveTo(PAD, footY - 15).lineTo(W - PAD, footY - 15).lineWidth(0.5).strokeColor(C.BORDER).stroke();
    
    const addrParts = [];
    if (est.user_address) addrParts.push(est.user_address);
    if (est.user_gst) addrParts.push(`GST: ${est.user_gst}`);
    if (addrParts.length > 0) {
      doc.font('Helvetica').fontSize(7).fillColor(C.MUTED)
         .text(addrParts.join('    |    '), 0, footY, { align: 'center', width: W, characterSpacing: 1 });
    }

    doc.end();
  });
}

// ─── EXPORTED: generate → save to disk → validate → return path ──
async function generateAndSavePDF(estimate) {
  // 1. Build the buffer
  const buffer = await buildPDFBuffer(estimate);

  // 2. Validate buffer is a real PDF
  if (!buffer || buffer.length < 200) {
    throw new Error(`PDF buffer too small (${buffer?.length ?? 0} bytes)`);
  }
  const magic = buffer.slice(0, 4).toString('ascii');
  if (magic !== '%PDF') {
    throw new Error(`Invalid PDF magic bytes: "${magic}"`);
  }

  // 3. Write to a unique temp file
  const tmpDir  = os.tmpdir();
  const tmpName = `kia-estimate-${randomUUID()}.pdf`;
  const tmpPath = path.join(tmpDir, tmpName);

  fs.writeFileSync(tmpPath, buffer);

  // 4. Validate the written file
  const stats = fs.statSync(tmpPath);
  if (stats.size < 200) {
    fs.unlinkSync(tmpPath);
    throw new Error(`Written PDF file too small: ${stats.size} bytes`);
  }

  const fd   = fs.openSync(tmpPath, 'r');
  const head = Buffer.alloc(4);
  fs.readSync(fd, head, 0, 4, 0);
  fs.closeSync(fd);

  if (head.toString('ascii') !== '%PDF') {
    fs.unlinkSync(tmpPath);
    throw new Error('Written PDF file failed structure validation');
  }

  logger.info(`PDF generated and validated: ${tmpPath} (${stats.size} bytes)`);
  return { tmpPath, size: stats.size };
}

module.exports = { generateAndSavePDF, buildPDFBuffer };
