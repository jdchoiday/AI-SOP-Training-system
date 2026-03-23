const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
        ShadingType, PageNumber, PageBreak, LevelFormat, TableOfContents } = require('docx');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0 };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, size: 36, font: "Arial" })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, size: 30, font: "Arial" })] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 26, font: "Arial" })] });
}
function p(text, opts = {}) {
  return new Paragraph({ spacing: { after: 120 },
    children: [new TextRun({ text, size: 22, font: "Arial", ...opts })] });
}
function step(num, text) {
  return new Paragraph({ spacing: { after: 100 }, indent: { left: 360 },
    children: [
      new TextRun({ text: `Step ${num}: `, bold: true, size: 22, font: "Arial", color: "2E5090" }),
      new TextRun({ text, size: 22, font: "Arial" })
    ] });
}
function bullet(text) {
  return new Paragraph({ spacing: { after: 80 }, indent: { left: 720 },
    children: [
      new TextRun({ text: "  \u2022  ", size: 22, font: "Arial", color: "2E5090" }),
      new TextRun({ text, size: 22, font: "Arial" })
    ] });
}
function tip(text) {
  return new Paragraph({ spacing: { before: 100, after: 100 }, indent: { left: 360 },
    shading: { fill: "E8F4FD", type: ShadingType.CLEAR },
    children: [
      new TextRun({ text: "\uD83D\uDCA1 TIP: ", bold: true, size: 20, font: "Arial", color: "2E5090" }),
      new TextRun({ text, size: 20, font: "Arial", color: "333333" })
    ] });
}
function warning(text) {
  return new Paragraph({ spacing: { before: 100, after: 100 }, indent: { left: 360 },
    shading: { fill: "FFF3CD", type: ShadingType.CLEAR },
    children: [
      new TextRun({ text: "\u26A0\uFE0F \uC8FC\uC758: ", bold: true, size: 20, font: "Arial", color: "856404" }),
      new TextRun({ text, size: 20, font: "Arial", color: "856404" })
    ] });
}
function infoRow(label, value) {
  return new TableRow({ children: [
    new TableCell({ borders, width: { size: 3000, type: WidthType.DXA },
      shading: { fill: "F0F4F8", type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, font: "Arial" })] })] }),
    new TableCell({ borders, width: { size: 6360, type: WidthType.DXA },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: value, size: 20, font: "Arial" })] })] })
  ]});
}
function spacer() { return new Paragraph({ spacing: { after: 200 }, children: [] }); }

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "1A365D" },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, font: "Arial", color: "2E5090" },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "4A6FA5" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ]
  },
  sections: [
    // ===== COVER PAGE =====
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
      },
      children: [
        spacer(), spacer(), spacer(), spacer(), spacer(),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
          children: [new TextRun({ text: "SOP Training System", size: 56, bold: true, font: "Arial", color: "1A365D" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
          children: [new TextRun({ text: "\uC0AC\uC6A9\uC790 \uB9E4\uB274\uC5BC", size: 40, bold: true, font: "Arial", color: "2E5090" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
          children: [new TextRun({ text: "User Manual v1.0", size: 28, font: "Arial", color: "666666" })] }),
        spacer(), spacer(),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
          children: [new TextRun({ text: "Playz Inc.", size: 24, font: "Arial", color: "666666" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
          children: [new TextRun({ text: "2026\uB144 3\uC6D4", size: 24, font: "Arial", color: "666666" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "\uBB38\uC11C \uBC84\uC804: 1.0 | \uBCF4\uC548 \uB4F1\uAE09: \uC0AC\uB0B4\uC6A9", size: 20, font: "Arial", color: "999999" })] }),
      ]
    },
    // ===== TABLE OF CONTENTS =====
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
      },
      headers: {
        default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "SOP Training System \uC0AC\uC6A9\uC790 \uB9E4\uB274\uC5BC", size: 16, font: "Arial", color: "999999" })] })] })
      },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "- ", size: 18, font: "Arial" }), new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Arial" }), new TextRun({ text: " -", size: 18, font: "Arial" })] })] })
      },
      children: [
        new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: "\uBAA9\uCC28", size: 36, bold: true, font: "Arial", color: "1A365D" })] }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({ children: [new PageBreak()] }),

        // ===== PART 1: OVERVIEW =====
        h1("\uC2DC\uC2A4\uD15C \uAC1C\uC694"),
        p("SOP Training System\uC740 \uC2E0\uADDC \uC9C1\uC6D0 \uAD50\uC721\uC744 AI\uB85C \uC790\uB3D9\uD654\uD558\uB294 \uD50C\uB7AB\uD3FC\uC785\uB2C8\uB2E4."),
        p("\uAD00\uB9AC\uC790\uAC00 SOP(\uD45C\uC900\uC6B4\uC601\uC808\uCC28)\uB97C \uC5C5\uB85C\uB4DC\uD558\uBA74, AI\uAC00 \uC790\uB3D9\uC73C\uB85C \uAD50\uC721 \uC601\uC0C1, \uB098\uB808\uC774\uC158, \uD034\uC988\uB97C \uC0DD\uC131\uD569\uB2C8\uB2E4."),
        p("\uC9C1\uC6D0\uC740 \uC21C\uC11C\uB300\uB85C \uC601\uC0C1\uC744 \uC2DC\uCCAD\uD558\uACE0 \uD034\uC988\uB97C \uD480\uBA70 SOP\uB97C \uD559\uC2B5\uD569\uB2C8\uB2E4."),
        spacer(),

        h2("\uC811\uC18D \uC815\uBCF4"),
        new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [3000, 6360], rows: [
          infoRow("\uC0AC\uC774\uD2B8 \uC8FC\uC18C", "https://sop-training-system.vercel.app"),
          infoRow("\uAD00\uB9AC\uC790 \uACC4\uC815", "admin@test.com / 1234"),
          infoRow("\uC9C0\uC810\uC7A5 \uACC4\uC815", "manager@test.com / 1234"),
          infoRow("\uC9C1\uC6D0 \uACC4\uC815", "staff@test.com / 1234"),
          infoRow("\uC9C0\uC6D0 \uC5B8\uC5B4", "\uD55C\uAD6D\uC5B4, English, Ti\u1EBFng Vi\u1EC7t"),
        ]}),
        spacer(),

        h2("\uC8FC\uC694 \uAE30\uB2A5"),
        bullet("AI \uAE30\uBC18 \uAD50\uC721 \uCF58\uD150\uCE20 \uC790\uB3D9 \uC0DD\uC131 (Gemini AI)"),
        bullet("AI \uC601\uC0C1 \uC0DD\uC131 (Wan 2.2) + TTS \uC74C\uC131 \uB098\uB808\uC774\uC158"),
        bullet("\uC601\uC0C1\uBCC4 \uBBF8\uB2C8\uD034\uC988 + \uCC55\uD130 \uC885\uD569\uC2DC\uD5D8 (20\uBB38\uD56D)"),
        bullet("S/A/B/C/D/F \uB4F1\uAE09 \uBC1C\uD589 \uC2DC\uC2A4\uD15C"),
        bullet("MBTI \uC131\uACA9\uAC80\uC0AC (\uC5C5\uBB34 \uC2A4\uD0C0\uC77C \uBD84\uC11D)"),
        bullet("AI \uCC57\uBD07 (\uC5C5\uC885 \uC81C\uD55C + \uD1A0\uD070 \uC81C\uD55C)"),
        bullet("\uB2E4\uC911 \uAD00\uB9AC\uC790 \uAD8C\uD55C (\uBCF8\uC0AC/\uC9C0\uC810\uC7A5)"),
        bullet("\uBAA8\uBC14\uC77C + \uC624\uD504\uB77C\uC778 \uC9C0\uC6D0 (PWA)"),
        bullet("\uD478\uC2DC \uC54C\uB9BC + \uD559\uC2B5 \uB9AC\uB9C8\uC778\uB354"),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== PART 2: EMPLOYEE MANUAL =====
        h1("\uC9C1\uC6D0\uC6A9 \uB9E4\uB274\uC5BC"),

        h2("1. \uB85C\uADF8\uC778"),
        step(1, "\uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C \uC0AC\uC774\uD2B8 \uC8FC\uC18C\uB97C \uC785\uB825\uD569\uB2C8\uB2E4."),
        step(2, "\uAD00\uB9AC\uC790\uC5D0\uAC8C \uBC1B\uC740 \uC774\uBA54\uC77C\uACFC \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD569\uB2C8\uB2E4."),
        step(3, "\"\uC9C1\uC6D0 \uB85C\uADF8\uC778\" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        tip("\uBE44\uBC00\uBC88\uD638\uB97C \uC78A\uC740 \uACBD\uC6B0 \"\uBE44\uBC00\uBC88\uD638 \uCC3E\uAE30\" \uB9C1\uD06C\uB97C \uD074\uB9AD\uD558\uBA74 \uC784\uC2DC \uBE44\uBC00\uBC88\uD638\uAC00 \uBC1C\uAE09\uB429\uB2C8\uB2E4."),
        spacer(),

        h2("2. \uBA54\uC778 \uD654\uBA74 (\uCC55\uD130 \uBAA9\uB85D)"),
        p("\uB85C\uADF8\uC778 \uD6C4 \uBA54\uC778 \uD654\uBA74\uC5D0\uC11C \uD559\uC2B5\uD560 \uCC55\uD130 \uBAA9\uB85D\uC744 \uD655\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."),
        bullet("\uC774\uC804 \uCC55\uD130\uB97C \uD1B5\uACFC\uD574\uC57C \uB2E4\uC74C \uCC55\uD130\uAC00 \uC7A0\uAE08 \uD574\uC81C\uB429\uB2C8\uB2E4."),
        bullet("\uAC01 \uCC55\uD130\uC5D0\uB294 \uC5EC\uB7EC \uAC1C\uC758 \uAD50\uC721 \uC601\uC0C1\uC774 \uD3EC\uD568\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4."),
        bullet("\uC0C1\uB2E8\uC5D0 \uC804\uCCB4 \uC9C4\uB3C4\uC728\uC774 \uD45C\uC2DC\uB429\uB2C8\uB2E4."),
        warning("\uC7A0\uAE08\uB41C \uCC55\uD130\uB97C \uD074\uB9AD\uD558\uBA74 \"\uC774\uC804 \uCC55\uD130\uB97C \uBA3C\uC800 \uD1B5\uACFC\uD574\uC57C \uD569\uB2C8\uB2E4\" \uBA54\uC2DC\uC9C0\uAC00 \uD45C\uC2DC\uB429\uB2C8\uB2E4."),
        spacer(),

        h2("3. \uC601\uC0C1 \uC2DC\uCCAD"),
        step(1, "\uCC55\uD130\uB97C \uD074\uB9AD\uD558\uBA74 \uC601\uC0C1 \uBAA9\uB85D\uC774 \uD45C\uC2DC\uB429\uB2C8\uB2E4."),
        step(2, "\uCCAB \uBC88\uC9F8 \uC601\uC0C1\uBD80\uD130 \uC21C\uC11C\uB300\uB85C \uC2DC\uCCAD\uD569\uB2C8\uB2E4."),
        step(3, "\uC601\uC0C1 \uC544\uB798\uC758 AI \uB098\uB808\uC774\uC158 \uD14D\uC2A4\uD2B8\uB97C \uC77D\uC73C\uBA70 \uD559\uC2B5\uD569\uB2C8\uB2E4."),
        step(4, "\"\uC77D\uC5B4\uC8FC\uAE30\" \uBC84\uD2BC\uC744 \uB204\uB974\uBA74 TTS \uC74C\uC131\uC73C\uB85C \uB4E4\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4."),
        step(5, "\uCD5C\uC18C \uC2DC\uCCAD \uC2DC\uAC04(30\uCD08)\uC774 \uC9C0\uB098\uBA74 \"\uD559\uC2B5 \uC644\uB8CC\" \uBC84\uD2BC\uC774 \uD65C\uC131\uD654\uB429\uB2C8\uB2E4."),
        tip("\uC774\uC804\uC5D0 \uBCF4\uB358 \uC601\uC0C1\uC740 \uC790\uB3D9\uC73C\uB85C \uAE30\uC5B5\uB418\uC5B4 \uC774\uC5B4\uBCF4\uAE30\uAC00 \uAC00\uB2A5\uD569\uB2C8\uB2E4."),
        spacer(),

        h2("4. \uC601\uC0C1\uBCC4 \uBBF8\uB2C8\uD034\uC988"),
        p("\uAC01 \uC601\uC0C1 \uC2DC\uCCAD \uC644\uB8CC \uD6C4 2\uBB38\uC81C\uC758 \uBBF8\uB2C8\uD034\uC988\uAC00 \uCD9C\uC81C\uB429\uB2C8\uB2E4."),
        step(1, "\"\uD559\uC2B5 \uC644\uB8CC\" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(2, "4\uC9C0\uC120\uB2E4 \uBB38\uC81C 2\uAC1C\uAC00 \uD45C\uC2DC\uB429\uB2C8\uB2E4."),
        step(3, "\uC815\uB2F5\uC744 \uC120\uD0DD\uD558\uBA74 \uC989\uC2DC \uC815/\uC624\uB2F5 \uD53C\uB4DC\uBC31\uC774 \uD45C\uC2DC\uB429\uB2C8\uB2E4."),
        step(4, "\uBAA8\uB4E0 \uBB38\uC81C\uB97C \uD480\uBA74 \uACB0\uACFC\uAC00 \uD45C\uC2DC\uB418\uACE0 \uB2E4\uC74C \uC601\uC0C1\uC73C\uB85C \uC774\uB3D9\uD569\uB2C8\uB2E4."),
        spacer(),

        h2("5. \uCC55\uD130 \uD034\uC988 (\uD1B5\uACFC \uC2DC\uD5D8)"),
        p("\uBAA8\uB4E0 \uC601\uC0C1\uC744 \uC2DC\uCCAD\uD55C \uD6C4 \uCC55\uD130 \uD034\uC988\uAC00 \uD65C\uC131\uD654\uB429\uB2C8\uB2E4."),
        step(1, "\uCC55\uD130 \uD558\uB2E8\uC758 \"\uCC55\uD130 \uD14C\uC2A4\uD2B8 \uC2DC\uC791\" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(2, "3~5\uBB38\uC81C\uC758 4\uC9C0\uC120\uB2E4 \uD034\uC988\uB97C \uD480\uB2C8\uB2E4."),
        step(3, "80% \uC774\uC0C1 \uB9DE\uCD94\uBA74 \uD1B5\uACFC, \uBBF8\uB2EC\uC2DC \uC7AC\uC2DC\uD5D8 \uAC00\uB2A5\uD569\uB2C8\uB2E4."),
        warning("\uD034\uC988 \uD1B5\uACFC \uC804\uC5D0\uB294 \uC885\uD569\uC2DC\uD5D8\uC744 \uBCFC \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."),
        spacer(),

        h2("6. \uCC55\uD130 \uC885\uD569\uC2DC\uD5D8 (20\uBB38\uD56D)"),
        p("\uCC55\uD130 \uD034\uC988 \uD1B5\uACFC \uD6C4 \uC885\uD569\uC2DC\uD5D8\uC744 \uBCFC \uC218 \uC788\uC2B5\uB2C8\uB2E4."),
        bullet("\uAC1D\uAD00\uC2DD 15\uBB38\uD56D (4\uC9C0\uC120\uB2E4)"),
        bullet("\uC8FC\uAD00\uC2DD 5\uBB38\uD56D (\uC9C1\uC811 \uC785\uB825)"),
        step(1, "\"\uCC55\uD130 \uC885\uD569\uC2DC\uD5D8 \uC2DC\uC791\" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(2, "\uBB38\uC81C \uBC88\uD638 \uC810\uC744 \uD074\uB9AD\uD558\uBA74 \uD574\uB2F9 \uBB38\uC81C\uB85C \uC774\uB3D9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."),
        step(3, "\uBAA8\uB4E0 \uBB38\uC81C\uB97C \uD480\uACE0 \"\uC81C\uCD9C\" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(4, "\uB4F1\uAE09\uC774 \uBC1C\uD589\uB429\uB2C8\uB2E4: S(95+), A(90+), B(80+), C(70+), D(60+), F(60\uBBF8\uB9CC)"),
        tip("\uC8FC\uAD00\uC2DD\uC740 \uD575\uC2EC \uD0A4\uC6CC\uB4DC\uB97C \uD3EC\uD568\uD558\uC5EC \uC791\uC131\uD558\uBA74 \uB192\uC740 \uC810\uC218\uB97C \uBC1B\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4."),
        spacer(),

        h2("7. MBTI \uC131\uACA9\uAC80\uC0AC"),
        p("\uBCC4\uB3C4 \uCC55\uD130\uB85C MBTI \uC131\uACA9\uAC80\uC0AC\uB97C \uC9C4\uD589\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."),
        step(1, "\uBA54\uC778 \uD654\uBA74\uC5D0\uC11C \"MBTI \uC131\uACA9\uAC80\uC0AC\" \uCC55\uD130\uB97C \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(2, "20\uAC1C\uC758 \uC9C8\uBB38\uC5D0 A \uB610\uB294 B\uB97C \uC120\uD0DD\uD569\uB2C8\uB2E4."),
        step(3, "\uACB0\uACFC \uD654\uBA74\uC5D0\uC11C \uBCF8\uC778\uC758 MBTI \uC720\uD615\uACFC \uC5C5\uBB34 \uC2A4\uD0C0\uC77C\uC744 \uD655\uC778\uD569\uB2C8\uB2E4."),
        tip("\uACB0\uACFC\uB294 \uAD00\uB9AC\uC790\uC5D0\uAC8C \uC790\uB3D9 \uC804\uB2EC\uB418\uC5B4 \uD300 \uAD6C\uC131\uC5D0 \uD65C\uC6A9\uB429\uB2C8\uB2E4."),
        spacer(),

        h2("8. AI \uCC57\uBD07"),
        p("SOP \uAD00\uB828 \uAD81\uAE08\uD55C \uC810\uC744 AI\uC5D0\uAC8C \uC9C8\uBB38\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."),
        step(1, "\uD558\uB2E8 \uB124\uBE44\uAC8C\uC774\uC158\uC758 \"AI \uC9C8\uBB38\" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(2, "\uC5C5\uBB34 \uAD00\uB828 \uC9C8\uBB38\uC744 \uC785\uB825\uD558\uACE0 \uC804\uC1A1\uD569\uB2C8\uB2E4."),
        warning("\uD558\uB8E8 50\uD68C \uC81C\uD55C\uC774 \uC788\uC73C\uBA70, \uC5C5\uBB34\uC640 \uBB34\uAD00\uD55C \uC9C8\uBB38\uC5D0\uB294 \uB2F5\uBCC0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."),
        spacer(),

        h2("9. \uB0B4 \uACB0\uACFC \uD655\uC778"),
        step(1, "\uD558\uB2E8 \uB124\uBE44\uAC8C\uC774\uC158\uC758 \"\uB0B4 \uACB0\uACFC\" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(2, "\uC804\uCCB4 \uC9C4\uB3C4\uC728, \uD1B5\uACFC \uCC55\uD130 \uC218, \uB4F1\uAE09\uC744 \uD655\uC778\uD569\uB2C8\uB2E4."),
        step(3, "\uBAA8\uB4E0 \uCC55\uD130 \uC644\uB8CC \uC2DC \"\uC218\uB8CC\uC99D \uC800\uC7A5\" \uBC84\uD2BC\uC73C\uB85C PNG \uB2E4\uC6B4\uB85C\uB4DC\uAC00 \uAC00\uB2A5\uD569\uB2C8\uB2E4."),
        spacer(),

        h2("10. \uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD"),
        step(1, "\uBA54\uC778 \uD654\uBA74 \uC624\uB978\uCABD \uC0C1\uB2E8\uC758 \uD1B1\uB2C8\uBC14\uD034 \uC544\uC774\uCF58\uC744 \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(2, "\uD604\uC7AC \uBE44\uBC00\uBC88\uD638\uC640 \uC0C8 \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD569\uB2C8\uB2E4."),
        step(3, "\"\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD\" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        spacer(),

        h2("11. \uC5B8\uC5B4 \uBCC0\uACBD"),
        p("\uBAA8\uB4E0 \uD398\uC774\uC9C0 \uD558\uB2E8\uC5D0 \uC5B8\uC5B4 \uC120\uD0DD \uBC84\uD2BC\uC774 \uC788\uC2B5\uB2C8\uB2E4."),
        bullet("\uD55C\uAD6D\uC5B4 (\uAE30\uBCF8)"),
        bullet("English"),
        bullet("Ti\u1EBFng Vi\u1EC7t"),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== PART 3: ADMIN MANUAL =====
        h1("\uAD00\uB9AC\uC790\uC6A9 \uB9E4\uB274\uC5BC"),

        h2("1. \uAD00\uB9AC\uC790 \uB85C\uADF8\uC778"),
        step(1, "\uB85C\uADF8\uC778 \uD654\uBA74\uC5D0\uC11C \"\uAD00\uB9AC\uC790 \uB85C\uADF8\uC778\" \uD0ED\uC744 \uC120\uD0DD\uD569\uB2C8\uB2E4."),
        step(2, "\uAD00\uB9AC\uC790 \uC774\uBA54\uC77C/\uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD569\uB2C8\uB2E4."),
        p("\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC740 2\uAC00\uC9C0\uC785\uB2C8\uB2E4:", { bold: true }),
        bullet("\uBCF8\uC0AC \uAD00\uB9AC\uC790 (superadmin): \uBAA8\uB4E0 \uAE30\uB2A5 \uC811\uADFC \uAC00\uB2A5"),
        bullet("\uC9C0\uC810\uC7A5 (branch_manager): \uC790\uC2E0\uC758 \uC9C0\uC810 \uC9C1\uC6D0\uB9CC \uAD00\uB9AC"),
        spacer(),

        h2("2. \uB300\uC2DC\uBCF4\uB4DC"),
        p("\uB85C\uADF8\uC778 \uD6C4 \uCCAB \uD654\uBA74\uC5D0\uC11C \uC804\uCCB4 \uD604\uD669\uC744 \uD655\uC778\uD569\uB2C8\uB2E4."),
        bullet("\uC804\uCCB4 \uC9C1\uC6D0 \uC218, \uC644\uB8CC\uC728, \uD559\uC2B5 \uC911, \uBBF8\uC2DC\uC791"),
        bullet("\uD3C9\uADE0 \uB4F1\uAE09 \uBC0F MBTI \uC751\uC2DC\uC728"),
        bullet("\uC9C0\uC810\uBCC4 \uD544\uD130\uB85C \uD2B9\uC815 \uC9C0\uC810\uB9CC \uD655\uC778 \uAC00\uB2A5"),
        spacer(),

        h2("3. SOP \uAD00\uB9AC"),
        h3("3-1. SOP \uC9C1\uC811 \uC791\uC131"),
        step(1, "\uC67C\uCABD \uBA54\uB274\uC5D0\uC11C \"SOP \uAD00\uB9AC\"\uB97C \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(2, "\"\uC0C8 SOP \uC791\uC131\" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(3, "\uC81C\uBAA9\uC744 \uC785\uB825\uD558\uACE0 \uC5D0\uB514\uD130\uC5D0 SOP \uB0B4\uC6A9\uC744 \uC791\uC131\uD569\uB2C8\uB2E4."),
        step(4, "\"\uC800\uC7A5\" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        spacer(),

        h3("3-2. SOP \uD30C\uC77C \uC5C5\uB85C\uB4DC"),
        step(1, "\"\uD30C\uC77C \uC5C5\uB85C\uB4DC\" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(2, "PDF, Word, TXT \uD30C\uC77C\uC744 \uC120\uD0DD\uD569\uB2C8\uB2E4."),
        step(3, "AI\uAC00 \uC790\uB3D9\uC73C\uB85C \uD14D\uC2A4\uD2B8\uB97C \uCD94\uCD9C\uD558\uC5EC SOP\uB85C \uBCC0\uD658\uD569\uB2C8\uB2E4."),
        spacer(),

        h3("3-3. AI \uCF58\uD150\uCE20 \uC0DD\uC131"),
        step(1, "SOP\uB97C \uC120\uD0DD\uD55C \uC0C1\uD0DC\uC5D0\uC11C \"AI \uCF58\uD150\uCE20 \uC0DD\uC131\" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(2, "AI\uAC00 \uC790\uB3D9\uC73C\uB85C \uC0DD\uC131\uD569\uB2C8\uB2E4:"),
        bullet("\uAD50\uC721 \uC2A4\uD06C\uB9BD\uD2B8 (\uC601\uC0C1 \uB098\uB808\uC774\uC158)"),
        bullet("\uD034\uC988 \uBB38\uC81C (4\uC9C0\uC120\uB2E4 + \uD574\uC124)"),
        bullet("AI \uC601\uC0C1 (\uC120\uD0DD \uC2DC)"),
        bullet("TTS \uC74C\uC131 \uB098\uB808\uC774\uC158"),
        step(3, "\"\uBC30\uD3EC\" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD558\uBA74 \uC9C1\uC6D0\uB4E4\uC774 \uD559\uC2B5\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."),
        tip("\uBC84\uC804 \uC774\uB825 \uBC84\uD2BC\uC73C\uB85C \uC774\uC804 \uBC84\uC804\uC744 \uD655\uC778/\uBCF5\uC6D0\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."),
        spacer(),

        h2("4. \uC9C1\uC6D0 \uAD00\uB9AC"),
        h3("4-1. \uAC1C\uBCC4 \uB4F1\uB85D"),
        step(1, "\"\uC9C1\uC6D0 \uAD00\uB9AC\" \uBA54\uB274\uB97C \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(2, "\"\uC9C1\uC6D0 \uCD94\uAC00\" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(3, "\uC774\uB984, \uC774\uBA54\uC77C, \uC9C0\uC810, \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD569\uB2C8\uB2E4."),
        spacer(),

        h3("4-2. CSV \uC77C\uAD04 \uB4F1\uB85D"),
        step(1, "\"\uC9C1\uC6D0 \uAD00\uB9AC\" \uBA54\uB274\uB97C \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(2, "\"CSV \uC5C5\uB85C\uB4DC\" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(3, "\uC544\uB798 \uD615\uC2DD\uC758 CSV \uD30C\uC77C\uC744 \uC5C5\uB85C\uB4DC\uD569\uB2C8\uB2E4:"),
        p("\uC774\uB984,\uC774\uBA54\uC77C,\uC9C0\uC810", { italics: true, color: "666666" }),
        p("\uAE40\uCCA0\uC218,kim@test.com,\uAC15\uB0A8\uC810", { italics: true, color: "666666" }),
        spacer(),

        h3("4-3. \uCD08\uB300 \uB9C1\uD06C"),
        step(1, "\"\uCD08\uB300 \uB9C1\uD06C \uC0DD\uC131\" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(2, "\uC0AC\uC6A9 \uD69F\uC218\uC640 \uB9CC\uB8CC\uC77C\uC744 \uC124\uC815\uD569\uB2C8\uB2E4."),
        step(3, "\uC0DD\uC131\uB41C \uB9C1\uD06C\uB97C \uC9C1\uC6D0\uC5D0\uAC8C \uACF5\uC720\uD569\uB2C8\uB2E4."),
        p("\uC9C1\uC6D0\uC774 \uB9C1\uD06C\uB97C \uD1B5\uD574 \uC9C1\uC811 \uACC4\uC815\uC744 \uC0DD\uC131\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."),
        spacer(),

        h2("5. \uD559\uC2B5 \uACBD\uB85C \uCEE4\uC2A4\uD140"),
        p("\uC9C0\uC810\uBCC4\uB85C \uB2E4\uB978 SOP\uB97C \uBC30\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."),
        step(1, "\"\uD559\uC2B5 \uACBD\uB85C\" \uBA54\uB274\uB97C \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(2, "\uC9C0\uC810\uBA85 \uC635\uC758 \"\uD3B8\uC9D1\" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(3, "\uD574\uB2F9 \uC9C0\uC810\uC5D0 \uBC30\uC815\uD560 SOP\uB97C \uCCB4\uD06C\uD569\uB2C8\uB2E4."),
        tip("\"\uC804\uCCB4 \uBC30\uC815\" \uCCB4\uD06C \uC2DC \uBAA8\uB4E0 SOP\uAC00 \uD45C\uC2DC\uB429\uB2C8\uB2E4."),
        spacer(),

        h2("6. AI \uB300\uD654 \uB85C\uADF8"),
        p("\uC9C1\uC6D0\uB4E4\uC774 AI \uCC57\uBD07\uC5D0 \uD55C \uC9C8\uBB38\uACFC \uB2F5\uBCC0\uC744 \uD655\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."),
        step(1, "\"AI \uB300\uD654 \uB85C\uADF8\" \uBA54\uB274\uB97C \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(2, "\uC9C1\uC6D0\uBCC4 \uC9C8\uBB38 \uD69F\uC218\uC640 \uB0B4\uC6A9\uC744 \uD655\uC778\uD569\uB2C8\uB2E4."),
        step(3, "\uAC80\uC0C9\uCC3D\uC73C\uB85C \uD2B9\uC815 \uD0A4\uC6CC\uB4DC\uB97C \uAC80\uC0C9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."),
        spacer(),

        h2("7. \uC54C\uB9BC \uBCF4\uB0B4\uAE30"),
        step(1, "\"\uC54C\uB9BC \uBCF4\uB0B4\uAE30\" \uBA54\uB274\uB97C \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(2, "\"\uC0C8 \uC54C\uB9BC\" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(3, "\uB300\uC0C1\uC744 \uC120\uD0DD\uD569\uB2C8\uB2E4: \uC804\uCCB4 / \uBBF8\uD559\uC2B5\uC790 / \uD2B9\uC815 \uC9C1\uC6D0"),
        step(4, "\uC54C\uB9BC \uC720\uD615\uACFC \uBA54\uC2DC\uC9C0\uB97C \uC785\uB825\uD558\uACE0 \uC804\uC1A1\uD569\uB2C8\uB2E4."),
        spacer(),

        h2("8. \uB9AC\uD3EC\uD2B8"),
        p("\uD559\uC2B5 \uD604\uD669 \uB9AC\uD3EC\uD2B8\uB97C \uD655\uC778\uD558\uACE0 \uB0B4\uBCF4\uB0BC \uC218 \uC788\uC2B5\uB2C8\uB2E4."),
        bullet("CSV \uB2E4\uC6B4\uB85C\uB4DC: \uC804\uCCB4 \uC9C1\uC6D0 \uB370\uC774\uD130"),
        bullet("PDF \uB9AC\uD3EC\uD2B8: \uC9C0\uC810\uBCC4 \uD1B5\uACC4 + \uCC55\uD130\uBCC4 \uD1B5\uACFC\uC728"),
        bullet("\uBBF8\uB9AC\uBCF4\uAE30: \uC778\uC1C4\uC6A9 \uB9AC\uD3EC\uD2B8"),
        spacer(),

        h2("9. \uAD00\uB9AC\uC790 \uAD00\uB9AC (\uBCF8\uC0AC\uB9CC)"),
        p("\uBCF8\uC0AC \uAD00\uB9AC\uC790\uB294 \uC9C0\uC810\uC7A5\uC744 \uCD94\uAC00/\uC81C\uAC70\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."),
        step(1, "\"\uAD00\uB9AC\uC790 \uAD00\uB9AC\" \uBA54\uB274\uB97C \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(2, "\"\uC9C0\uC810\uC7A5 \uCD94\uAC00\" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD569\uB2C8\uB2E4."),
        step(3, "\uAE30\uC874 \uC9C1\uC6D0 \uC911 \uC9C0\uC810\uC7A5\uC73C\uB85C \uC2B9\uACA9\uD560 \uC0AC\uB78C\uC744 \uC120\uD0DD\uD569\uB2C8\uB2E4."),
        spacer(),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== PART 4: FAQ =====
        h1("\uC790\uC8FC \uBB3B\uB294 \uC9C8\uBB38 (FAQ)"),
        spacer(),
        h3("Q: \uBE44\uBC00\uBC88\uD638\uB97C \uC78A\uC5C8\uC2B5\uB2C8\uB2E4."),
        p("\uB85C\uADF8\uC778 \uD654\uBA74\uC5D0\uC11C \"\uBE44\uBC00\uBC88\uD638 \uCC3E\uAE30\"\uB97C \uD074\uB9AD\uD558\uBA74 \uC784\uC2DC \uBE44\uBC00\uBC88\uD638\uAC00 \uBC1C\uAE09\uB429\uB2C8\uB2E4. \uB85C\uADF8\uC778 \uD6C4 \uBC18\uB4DC\uC2DC \uBE44\uBC00\uBC88\uD638\uB97C \uBCC0\uACBD\uD574\uC8FC\uC138\uC694."),
        spacer(),
        h3("Q: \uC601\uC0C1\uC774 \uC7AC\uC0DD\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."),
        p("\uC778\uD130\uB137 \uC5F0\uACB0\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694. PWA\uB85C \uC624\uD504\uB77C\uC778 \uCE90\uC2DC\uB41C \uCF58\uD150\uCE20\uB294 \uBCFC \uC218 \uC788\uC9C0\uB9CC, \uC0C8 \uC601\uC0C1\uC740 \uC778\uD130\uB137\uC774 \uD544\uC694\uD569\uB2C8\uB2E4."),
        spacer(),
        h3("Q: \uD034\uC988\uC5D0 \uB5A8\uC5B4\uC84C\uB294\uB370 \uC7AC\uC2DC\uD5D8\uC774 \uAC00\uB2A5\uD55C\uAC00\uC694?"),
        p("\uB124, \uCC55\uD130 \uD034\uC988\uC640 \uC885\uD569\uC2DC\uD5D8 \uBAA8\uB450 \uC7AC\uC2DC\uD5D8\uC774 \uAC00\uB2A5\uD569\uB2C8\uB2E4. \uC885\uD569\uC2DC\uD5D8\uC740 \uAC00\uC7A5 \uCD5C\uADFC \uB4F1\uAE09\uC774 \uAE30\uB85D\uB429\uB2C8\uB2E4."),
        spacer(),
        h3("Q: \uBAA8\uBC14\uC77C\uC5D0\uC11C\uB3C4 \uC0AC\uC6A9\uD560 \uC218 \uC788\uB098\uC694?"),
        p("\uB124, \uBAA8\uBC14\uC77C \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C \uC811\uC18D\uD558\uBA74 \uBAA8\uBC14\uC77C\uC5D0 \uCD5C\uC801\uD654\uB41C \uD654\uBA74\uC774 \uD45C\uC2DC\uB429\uB2C8\uB2E4. \"\uD648 \uD654\uBA74\uC5D0 \uCD94\uAC00\"\uD558\uBA74 \uC571\uCC98\uB7FC \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."),
        spacer(),
        h3("Q: \uC5B8\uC5B4\uB97C \uBCC0\uACBD\uD558\uACE0 \uC2F6\uC2B5\uB2C8\uB2E4."),
        p("\uAC01 \uD398\uC774\uC9C0 \uD558\uB2E8\uC5D0 \uC788\uB294 \uC5B8\uC5B4 \uBC84\uD2BC(\uD55C\uAD6D\uC5B4/English/Vi\u1EC7t)\uC744 \uD074\uB9AD\uD558\uBA74 \uC989\uC2DC \uBCC0\uACBD\uB429\uB2C8\uB2E4."),
        spacer(),
        h3("Q: \uC9C0\uC810\uC7A5\uACFC \uBCF8\uC0AC \uAD00\uB9AC\uC790\uC758 \uCC28\uC774\uB294?"),
        p("\uBCF8\uC0AC \uAD00\uB9AC\uC790\uB294 \uBAA8\uB4E0 \uC9C0\uC810\uC758 \uB370\uC774\uD130\uB97C \uBCFC \uC218 \uC788\uACE0 SOP\uB97C \uD3B8\uC9D1\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uC9C0\uC810\uC7A5\uC740 \uC790\uC2E0\uC758 \uC9C0\uC810 \uC9C1\uC6D0\uB9CC \uAD00\uB9AC\uD560 \uC218 \uC788\uC73C\uBA70 SOP\uB294 \uC77D\uAE30 \uC804\uC6A9\uC785\uB2C8\uB2E4."),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== PART 5: TROUBLESHOOTING =====
        h1("\uBB38\uC81C \uD574\uACB0"),
        spacer(),
        new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [3000, 6360], rows: [
          new TableRow({ children: [
            new TableCell({ borders, width: { size: 3000, type: WidthType.DXA },
              shading: { fill: "1A365D", type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: "\uC99D\uC0C1", bold: true, size: 20, font: "Arial", color: "FFFFFF" })] })] }),
            new TableCell({ borders, width: { size: 6360, type: WidthType.DXA },
              shading: { fill: "1A365D", type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: "\uD574\uACB0 \uBC29\uBC95", bold: true, size: 20, font: "Arial", color: "FFFFFF" })] })] }),
          ]}),
          infoRow("\uB85C\uADF8\uC778\uC774 \uC548 \uB428", "\uC774\uBA54\uC77C/\uBE44\uBC00\uBC88\uD638 \uD655\uC778. \uC784\uC2DC \uBE44\uBC00\uBC88\uD638 \uBC1C\uAE09 \uD6C4 \uC7AC\uC2DC\uB3C4."),
          infoRow("\uD654\uBA74\uC774 \uD558\uC580 \uCC44\uB85C \uBA48\uCDA4", "\uBE0C\uB77C\uC6B0\uC800 \uCE90\uC2DC \uC0AD\uC81C (Ctrl+Shift+Del) \uD6C4 \uC0C8\uB85C\uACE0\uCE68."),
          infoRow("AI \uCF58\uD150\uCE20\uAC00 \uC0DD\uC131 \uC548 \uB428", "Gemini API \uD0A4 \uD655\uC778. Vercel \uD658\uACBD\uBCC0\uC218 \uC124\uC815 \uD655\uC778."),
          infoRow("\uC601\uC0C1\uC774 \uC548 \uB098\uC634", "SiliconFlow \uD06C\uB808\uB527 \uD655\uC778. \uBB34\uB8CC \uD06C\uB808\uB527 \uC18C\uC9C4 \uC2DC \uCDA9\uC804 \uD544\uC694."),
          infoRow("TTS \uC74C\uC131\uC774 \uC548 \uB098\uC634", "\uBE0C\uB77C\uC6B0\uC800 \uC74C\uC131 \uC124\uC815 \uD655\uC778. Chrome \uCD94\uCC9C."),
          infoRow("\uD478\uC2DC \uC54C\uB9BC\uC774 \uC548 \uC634", "\uBE0C\uB77C\uC6B0\uC800 \uC54C\uB9BC \uAD8C\uD55C \uD5C8\uC6A9 \uD544\uC694. \uC571 \uD5A5 \uBC84\uD2BC \uD074\uB9AD."),
          infoRow("24\uC2DC\uAC04 \uD6C4 \uC790\uB3D9 \uB85C\uADF8\uC544\uC6C3", "\uBCF4\uC548\uC744 \uC704\uD55C \uC815\uC0C1 \uB3D9\uC791. \uB2E4\uC2DC \uB85C\uADF8\uC778\uD574\uC8FC\uC138\uC694."),
        ]}),

        spacer(), spacer(),

        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 },
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 8 } },
          children: [new TextRun({ text: "\uBB38\uC758\uCC98: admin@playz.co.kr", size: 20, font: "Arial", color: "666666" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "\u00A9 2026 Playz Inc. All Rights Reserved.", size: 18, font: "Arial", color: "999999" })] }),
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  const outPath = "C:\\Claude\\AI sop training system\\docs\\SOP_Training_System_사용자매뉴얼_v1.0.docx";
  fs.writeFileSync(outPath, buffer);
  console.log("Created: " + outPath);
});
