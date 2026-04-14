const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
        ShadingType, PageNumber, LevelFormat } = require("docx");

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

// Header cell helper
function hCell(text, width) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: { fill: "2E5090", type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text, bold: true, color: "FFFFFF", font: "Arial", size: 22 })
    ]})]
  });
}

// Body cell helper
function bCell(text, width, opts = {}) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: opts.shade ? { fill: "F2F7FB", type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT, children: [
      new TextRun({ text, font: "Arial", size: 20, bold: !!opts.bold, color: opts.color || "333333" })
    ]})]
  });
}

// Section title
function sectionTitle(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 32, color: "2E5090" })]
  });
}

// Sub title
function subTitle(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 26, color: "3A6EA5" })]
  });
}

// Body text
function bodyText(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.noSpaceAfter ? 40 : 150, line: 360 },
    children: [new TextRun({ text, font: "Arial", size: 21, color: "444444", ...opts })]
  });
}

// Bullet
function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 80, line: 340 },
    children: [new TextRun({ text, font: "Arial", size: 21, color: "444444" })]
  });
}

// Info box
function infoBox(text) {
  return new Paragraph({
    spacing: { before: 100, after: 200 },
    indent: { left: 300, right: 300 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: "2E5090", space: 8 } },
    children: [new TextRun({ text, font: "Arial", size: 20, italics: true, color: "2E5090" })]
  });
}

// Spacer
function spacer(h = 200) {
  return new Paragraph({ spacing: { before: h }, children: [] });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
        ]
      },
      { reference: "numbers",
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        ]
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1200, left: 1440 }
      }
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "2E5090", space: 4 } },
        children: [new TextRun({ text: "SOP Training System \u2014 XP & \uCE6D\uCC2C \uC2DC\uC2A4\uD15C \uAC00\uC774\uB4DC", font: "Arial", size: 16, color: "999999" })]
      })]})
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC", space: 4 } },
        children: [
          new TextRun({ text: "Page ", font: "Arial", size: 16, color: "999999" }),
          new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "999999" })
        ]
      })]})
    },
    children: [

      // ===== COVER =====
      spacer(2000),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: "\uD83C\uDFC6", size: 80 })
      ]}),
      spacer(200),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [
        new TextRun({ text: "SOP Training System", bold: true, font: "Arial", size: 48, color: "2E5090" })
      ]}),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
        new TextRun({ text: "XP \uD3EC\uC778\uD2B8 & \uCE6D\uCC2C \uC2DC\uC2A4\uD15C \uAC00\uC774\uB4DC", bold: true, font: "Arial", size: 36, color: "3A6EA5" })
      ]}),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [
        new TextRun({ text: "\uC9C1\uC6D0 \uBC0F \uACBD\uC601\uC9C4\uC744 \uC704\uD55C \uC6B4\uC601 \uAC00\uC774\uB4DC", font: "Arial", size: 24, color: "666666" })
      ]}),
      spacer(400),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: "\uBB38\uC11C \uBC84\uC804: v1.0  |  \uC791\uC131\uC77C: 2026\uB144 4\uC6D4 12\uC77C", font: "Arial", size: 18, color: "999999" })
      ]}),

      // ===== 1. 시스템 개요 =====
      spacer(600),
      sectionTitle("1. \uC2DC\uC2A4\uD15C \uAC1C\uC694"),
      bodyText("SOP Training System\uC740 \uC9C1\uC6D0 \uAD50\uC721\uC744 \uAC8C\uC784\uD654(Gamification)\uD558\uC5EC \uD559\uC2B5 \uB3D9\uAE30\uB97C \uBD80\uC5EC\uD558\uB294 \uC2DC\uC2A4\uD15C\uC785\uB2C8\uB2E4."),
      bodyText("\uC9C1\uC6D0\uB4E4\uC740 SOP \uC601\uC0C1 \uD559\uC2B5, \uD000\uC988, \uCE6D\uCC2C \uD65C\uB3D9\uC744 \uD1B5\uD574 XP(\uACBD\uD5D8\uCE58)\uB97C \uC801\uB9BD\uD558\uACE0, \uCD95\uC801\uB41C XP\uC5D0 \uB530\uB77C \uB4F1\uAE09(\uD2F0\uC5B4)\uC774 \uC0C1\uC2B9\uD569\uB2C8\uB2E4."),
      infoBox("\uD575\uC2EC \uC6D0\uCE59: \uC9C4\uC9DC \uD559\uC2B5\uACFC \uD611\uC5C5\uC5D0\uB9CC XP\uB97C \uBD80\uC5EC\uD569\uB2C8\uB2E4. \uBAA8\uB4E0 XP\uB294 \uC11C\uBC84\uC5D0 \uAE30\uB85D\uB418\uBA70, \uC870\uC791\uC774 \uBD88\uAC00\uB2A5\uD569\uB2C8\uB2E4."),

      // ===== 2. XP 획득 기준 =====
      sectionTitle("2. XP \uD68D\uB4DD \uAE30\uC900"),
      bodyText("XP\uB97C \uC5BB\uC744 \uC218 \uC788\uB294 \uD65C\uB3D9\uACFC \uAC01 \uD65C\uB3D9\uBCC4 \uD3EC\uC778\uD2B8 \uAE30\uC900\uC740 \uB2E4\uC74C\uACFC \uAC19\uC2B5\uB2C8\uB2E4."),

      // XP 기준 테이블
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [500, 2000, 1200, 4660, 1000],
        rows: [
          new TableRow({ children: [
            hCell("#", 500), hCell("\uD65C\uB3D9", 2000), hCell("XP", 1200), hCell("\uC124\uBA85", 4660), hCell("\uD68C\uC218", 1000)
          ]}),
          new TableRow({ children: [
            bCell("\uD83D\uDCFA", 500, {center:true}),
            bCell("\uCC55\uD130 \uC601\uC0C1 \uD559\uC2B5 \uC644\uB8CC", 2000, {bold:true}),
            bCell("+50 XP", 1200, {center:true, bold:true, color:"2E7D32"}),
            bCell("SOP \uC601\uC0C1\uC744 90% \uC774\uC0C1 \uC2DC\uCCAD \uC644\uB8CC \uC2DC \uC790\uB3D9 \uC9C0\uAE09", 4660),
            bCell("\uCC55\uD130\uB2F9 1\uD68C", 1000, {center:true})
          ]}),
          new TableRow({ children: [
            bCell("\u2705", 500, {center:true, shade:true}),
            bCell("\uD000\uC988 \uC815\uB2F5", 2000, {bold:true, shade:true}),
            bCell("+10 XP", 1200, {center:true, bold:true, color:"2E7D32", shade:true}),
            bCell("\uCC55\uD130 \uD000\uC988\uC5D0\uC11C \uC815\uB2F5 1\uAC1C\uB2F9 10 XP \uC9C0\uAE09", 4660, {shade:true}),
            bCell("\uC815\uB2F5\uB2F9", 1000, {center:true, shade:true})
          ]}),
          new TableRow({ children: [
            bCell("\uD83D\uDCAF", 500, {center:true}),
            bCell("\uD000\uC988 \uB9CC\uC810 \uBCF4\uB108\uC2A4", 2000, {bold:true}),
            bCell("+30 XP", 1200, {center:true, bold:true, color:"2E7D32"}),
            bCell("\uCC55\uD130 \uD000\uC988 \uC804\uBB38 \uC815\uB2F5 \uC2DC \uCD94\uAC00 \uBCF4\uB108\uC2A4 \uC9C0\uAE09", 4660),
            bCell("\uCC55\uD130\uB2F9 1\uD68C", 1000, {center:true})
          ]}),
          new TableRow({ children: [
            bCell("\uD83C\uDF93", 500, {center:true, shade:true}),
            bCell("\uC804\uCCB4 \uACFC\uC815 \uC644\uC8FC", 2000, {bold:true, shade:true}),
            bCell("+200 XP", 1200, {center:true, bold:true, color:"1565C0", shade:true}),
            bCell("\uBAA8\uB4E0 \uCC55\uD130\uC758 \uC601\uC0C1 + \uD000\uC988\uB97C \uC644\uB8CC\uD588\uC744 \uB54C \uC9C0\uAE09", 4660, {shade:true}),
            bCell("1\uD68C", 1000, {center:true, shade:true})
          ]}),
          new TableRow({ children: [
            bCell("\uD83E\uDD1D", 500, {center:true}),
            bCell("\uCE6D\uCC2C \uBCF4\uB0B4\uAE30", 2000, {bold:true}),
            bCell("+3 XP", 1200, {center:true, bold:true, color:"2E7D32"}),
            bCell("\uB3D9\uB8CC\uC5D0\uAC8C \uCE6D\uCC2C\uC744 \uBCF4\uB0BC \uB54C\uB9C8\uB2E4 \uBCF4\uB0B4\uB294 \uC0AC\uB78C\uC5D0\uAC8C \uC9C0\uAE09", 4660),
            bCell("\uD558\uB8E8 2\uD68C", 1000, {center:true})
          ]}),
          new TableRow({ children: [
            bCell("\u2B50", 500, {center:true, shade:true}),
            bCell("\uCE6D\uCC2C 2\uAC1C \uBAA8\uC73C\uAE30", 2000, {bold:true, shade:true}),
            bCell("+15 XP", 1200, {center:true, bold:true, color:"2E7D32", shade:true}),
            bCell("\uCE6D\uCC2C\uC744 2\uAC1C \uBC1B\uC744 \uB54C\uB9C8\uB2E4 \uBC1B\uB294 \uC0AC\uB78C\uC5D0\uAC8C \uC790\uB3D9 \uC804\uD658", 4660, {shade:true}),
            bCell("\uBB34\uC81C\uD55C", 1000, {center:true, shade:true})
          ]}),
          new TableRow({ children: [
            bCell("\uD83C\uDFC5", 500, {center:true}),
            bCell("\uAD00\uB9AC\uC790 \uD2B9\uBCC4 \uC218\uC5EC", 2000, {bold:true}),
            bCell("50~1,500", 1200, {center:true, bold:true, color:"E65100"}),
            bCell("\uAD00\uB9AC\uC790\uAC00 \uC6B0\uC218 \uC9C1\uC6D0\uC5D0\uAC8C \uC9C1\uC811 \uC218\uC5EC (\uC0AC\uC720 \uD544\uC218 \uC785\uB825)", 4660),
            bCell("\uC218\uB3D9", 1000, {center:true})
          ]}),
        ]
      }),
      spacer(100),

      // 시뮬레이션
      subTitle("2-1. XP \uC2DC\uBBAC\uB808\uC774\uC158 \uC608\uC2DC"),
      bodyText("\uCC55\uD130 5\uAC1C, \uD000\uC988 3\uBB38\uC81C/\uCC55\uD130 \uAE30\uC900\uC73C\uB85C \uC131\uC2E4\uD788 \uD559\uC2B5\uD55C \uC9C1\uC6D0\uC758 \uC608\uC0C1 XP:"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [4000, 1600, 1600, 2160],
        rows: [
          new TableRow({ children: [
            hCell("\uD56D\uBAA9", 4000), hCell("\uACC4\uC0B0", 1600), hCell("XP", 1600), hCell("\uBE44\uACE0", 2160)
          ]}),
          new TableRow({ children: [
            bCell("\uCC55\uD130 5\uAC1C \uC601\uC0C1 \uC2DC\uCCAD", 4000),
            bCell("50 \u00D7 5", 1600, {center:true}),
            bCell("250 XP", 1600, {center:true, bold:true}),
            bCell("", 2160)
          ]}),
          new TableRow({ children: [
            bCell("\uD000\uC988 \uC815\uB2F5 (15\uBB38\uC81C \uC911 12\uAC1C)", 4000, {shade:true}),
            bCell("10 \u00D7 12", 1600, {center:true, shade:true}),
            bCell("120 XP", 1600, {center:true, bold:true, shade:true}),
            bCell("80% \uC815\uB2F5\uB960", 2160, {shade:true})
          ]}),
          new TableRow({ children: [
            bCell("\uB9CC\uC810 \uBCF4\uB108\uC2A4 (2\uAC1C \uCC55\uD130 \uB9CC\uC810)", 4000),
            bCell("30 \u00D7 2", 1600, {center:true}),
            bCell("60 XP", 1600, {center:true, bold:true}),
            bCell("", 2160)
          ]}),
          new TableRow({ children: [
            bCell("\uC804\uCCB4 \uACFC\uC815 \uC644\uC8FC \uBCF4\uB108\uC2A4", 4000, {shade:true}),
            bCell("\u2014", 1600, {center:true, shade:true}),
            bCell("200 XP", 1600, {center:true, bold:true, shade:true}),
            bCell("1\uD68C\uC131", 2160, {shade:true})
          ]}),
          new TableRow({ children: [
            bCell("\uCE6D\uCC2C \uBCF4\uB0B4\uAE30 (10\uD68C)", 4000),
            bCell("3 \u00D7 10", 1600, {center:true}),
            bCell("30 XP", 1600, {center:true, bold:true}),
            bCell("", 2160)
          ]}),
          new TableRow({ children: [
            bCell("\uCE6D\uCC2C \uBC1B\uAE30 (6\uAC1C \u2192 3\uC2A4\uD0DD)", 4000, {shade:true}),
            bCell("15 \u00D7 3", 1600, {center:true, shade:true}),
            bCell("45 XP", 1600, {center:true, bold:true, shade:true}),
            bCell("", 2160, {shade:true})
          ]}),
          new TableRow({ children: [
            bCell("\uD569\uACC4", 4000, {bold:true}),
            bCell("", 1600),
            bCell("705 XP", 1600, {center:true, bold:true, color:"1565C0"}),
            bCell("\u2192 \uC131\uC7A5 \uB4F1\uAE09 \uB3C4\uB2EC", 2160, {bold:true, color:"1565C0"})
          ]}),
        ]
      }),

      // ===== 3. 등급(티어) 시스템 =====
      sectionTitle("3. \uB4F1\uAE09(\uD2F0\uC5B4) \uC2DC\uC2A4\uD15C"),
      bodyText("\uCD95\uC801\uB41C XP\uC5D0 \uB530\uB77C 9\uB2E8\uACC4 \uB4F1\uAE09\uC774 \uBD80\uC5EC\uB429\uB2C8\uB2E4. \uAC01 \uB4F1\uAE09\uC740 IV \u2192 III \u2192 II \u2192 I \uC758 4\uB2E8\uACC4 \uC138\uBD80 \uB808\uBCA8\uC774 \uC788\uC2B5\uB2C8\uB2E4."),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [700, 700, 1600, 1200, 1600, 1600, 1960],
        rows: [
          new TableRow({ children: [
            hCell("\uB2E8\uACC4", 700), hCell("", 700), hCell("\uD55C\uAD6D\uC5B4", 1600), hCell("English", 1200),
            hCell("\uD544\uC694 XP", 1600), hCell("Vietnamese", 1600), hCell("\uBAA9\uD45C \uAE30\uAC04", 1960)
          ]}),
          new TableRow({ children: [
            bCell("1", 700, {center:true}), bCell("\uD83C\uDF31", 700, {center:true}),
            bCell("\uC0C8\uC2F9", 1600, {bold:true}), bCell("Sprout", 1200),
            bCell("0 XP", 1600, {center:true}), bCell("M\u1EA7m Non", 1600),
            bCell("\uAC00\uC785 \uC2DC \uC790\uB3D9", 1960)
          ]}),
          new TableRow({ children: [
            bCell("2", 700, {center:true, shade:true}), bCell("\uD83E\uDD49", 700, {center:true, shade:true}),
            bCell("\uC131\uC7A5", 1600, {bold:true, shade:true}), bCell("Growing", 1200, {shade:true}),
            bCell("500 XP", 1600, {center:true, shade:true}), bCell("\u0110ang L\u1EDBn", 1600, {shade:true}),
            bCell("~2\uC8FC", 1960, {shade:true})
          ]}),
          new TableRow({ children: [
            bCell("3", 700, {center:true}), bCell("\u2B50", 700, {center:true}),
            bCell("\uBE5B\uB098\uB294", 1600, {bold:true}), bCell("Shining", 1200),
            bCell("1,500 XP", 1600, {center:true}), bCell("T\u1ECFa S\u00E1ng", 1600),
            bCell("~1\uAC1C\uC6D4", 1960)
          ]}),
          new TableRow({ children: [
            bCell("4", 700, {center:true, shade:true}), bCell("\uD83C\uDF1F", 700, {center:true, shade:true}),
            bCell("\uD669\uAE08\uBCC4", 1600, {bold:true, shade:true}), bCell("Gold Star", 1200, {shade:true}),
            bCell("3,500 XP", 1600, {center:true, shade:true}), bCell("Ng\u00F4i Sao V\u00E0ng", 1600, {shade:true}),
            bCell("~2\uAC1C\uC6D4", 1960, {shade:true})
          ]}),
          new TableRow({ children: [
            bCell("5", 700, {center:true}), bCell("\uD83D\uDC8E", 700, {center:true}),
            bCell("\uC815\uC608", 1600, {bold:true}), bCell("Elite", 1200),
            bCell("7,000 XP", 1600, {center:true}), bCell("Tinh Nhu\u1EC7", 1600),
            bCell("~4\uAC1C\uC6D4", 1960)
          ]}),
          new TableRow({ children: [
            bCell("6", 700, {center:true, shade:true}), bCell("\uD83D\uDC51", 700, {center:true, shade:true}),
            bCell("\uCC54\uD53C\uC5B8", 1600, {bold:true, shade:true}), bCell("Champion", 1200, {shade:true}),
            bCell("13,000 XP", 1600, {center:true, shade:true}), bCell("Nh\u00E0 V\u00F4 \u0110\u1ECBch", 1600, {shade:true}),
            bCell("~6\uAC1C\uC6D4", 1960, {shade:true})
          ]}),
          new TableRow({ children: [
            bCell("7", 700, {center:true}), bCell("\uD83D\uDD2E", 700, {center:true}),
            bCell("\uC804\uC124", 1600, {bold:true}), bCell("Legend", 1200),
            bCell("22,000 XP", 1600, {center:true}), bCell("Huy\u1EC1n Tho\u1EA1i", 1600),
            bCell("~10\uAC1C\uC6D4", 1960)
          ]}),
          new TableRow({ children: [
            bCell("8", 700, {center:true, shade:true}), bCell("\uD83D\uDD25", 700, {center:true, shade:true}),
            bCell("\uBD88\uAF43", 1600, {bold:true, shade:true}), bCell("Blaze", 1200, {shade:true}),
            bCell("35,000 XP", 1600, {center:true, shade:true}), bCell("Ng\u1ECDn L\u1EEDa", 1600, {shade:true}),
            bCell("~14\uAC1C\uC6D4", 1960, {shade:true})
          ]}),
          new TableRow({ children: [
            bCell("9", 700, {center:true}), bCell("\u26A1", 700, {center:true}),
            bCell("\uD0A4\uC6B0\uC790 \uC2E0", 1600, {bold:true, color:"E65100"}), bCell("Kiwooza God", 1200, {color:"E65100"}),
            bCell("50,000 XP", 1600, {center:true, color:"E65100"}), bCell("Th\u1EA7n Kiwooza", 1600, {color:"E65100"}),
            bCell("\uCD5C\uACE0 \uB4F1\uAE09", 1960, {bold:true, color:"E65100"})
          ]}),
        ]
      }),

      // ===== 4. 칭찬 시스템 =====
      sectionTitle("4. \uCE6D\uCC2C \uC2DC\uC2A4\uD15C"),

      subTitle("4-1. \uCE6D\uCC2C \uADDC\uCE59"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 6360],
        rows: [
          new TableRow({ children: [ hCell("\uD56D\uBAA9", 3000), hCell("\uADDC\uCE59", 6360) ]}),
          new TableRow({ children: [
            bCell("\uD558\uB8E8 \uBCF4\uB0B4\uAE30 \uC81C\uD55C", 3000, {bold:true}),
            bCell("\uD558\uB8E8 \uCD5C\uB300 2\uD68C (\uC804\uCCB4 \uB300\uC0C1 \uD569\uC0B0)", 6360)
          ]}),
          new TableRow({ children: [
            bCell("\uAC19\uC740 \uC0AC\uB78C \uC81C\uD55C", 3000, {bold:true, shade:true}),
            bCell("\uAC19\uC740 \uB3D9\uB8CC\uC5D0\uAC8C \uD558\uB8E8 \uCD5C\uB300 1\uD68C", 6360, {shade:true})
          ]}),
          new TableRow({ children: [
            bCell("\uC790\uAE30 \uCE6D\uCC2C \uAE08\uC9C0", 3000, {bold:true}),
            bCell("\uBCF8\uC778\uC5D0\uAC8C \uCE6D\uCC2C \uBCF4\uB0B4\uAE30 \uBD88\uAC00 (\uC11C\uBC84\uC5D0\uC11C \uCC28\uB2E8)", 6360)
          ]}),
          new TableRow({ children: [
            bCell("XP \uC804\uD658 (보내는 사람)", 3000, {bold:true, shade:true}),
            bCell("\uCE6D\uCC2C 1\uD68C \uBCF4\uB0BC \uB54C\uB9C8\uB2E4 +3 XP \uC790\uB3D9 \uC9C0\uAE09", 6360, {shade:true})
          ]}),
          new TableRow({ children: [
            bCell("XP \uC804\uD658 (\uBC1B\uB294 \uC0AC\uB78C)", 3000, {bold:true}),
            bCell("\uCE6D\uCC2C 2\uAC1C \uBAA8\uC77C \uB54C\uB9C8\uB2E4 +15 XP \uC790\uB3D9 \uC804\uD658", 6360)
          ]}),
        ]
      }),
      spacer(100),

      subTitle("4-2. \uCE6D\uCC2C \uD750\uB984 \uC608\uC2DC"),
      bodyText("\u2460 \uAE40\uBBFC\uC218\uB2D8\uC774 \uBC15\uC9C0\uC740\uB2D8\uC5D0\uAC8C \uCE6D\uCC2C \uBCF4\uB0C4 \u2192 \uAE40\uBBFC\uC218 +3 XP"),
      bodyText("\u2461 \uC774\uC601\uD76C\uB2D8\uC774 \uBC15\uC9C0\uC740\uB2D8\uC5D0\uAC8C \uCE6D\uCC2C \uBCF4\uB0C4 \u2192 \uC774\uC601\uD76C +3 XP"),
      bodyText("\u2462 \uBC15\uC9C0\uC740\uB2D8 \uCE6D\uCC2C 2\uAC1C \uB2EC\uC131! \u2192 \uBC15\uC9C0\uC740 +15 XP \uC790\uB3D9 \uC804\uD658"),
      infoBox("\uCE6D\uCC2C\uC740 \uC120\uC21C\uD658 \uAD6C\uC870\uC785\uB2C8\uB2E4. \uBCF4\uB0B4\uB294 \uC0AC\uB78C\uB3C4 XP\uB97C \uBC1B\uACE0, \uBC1B\uB294 \uC0AC\uB78C\uB3C4 \uBAA8\uC774\uBA74 XP\uB85C \uC804\uD658\uB429\uB2C8\uB2E4."),

      // ===== 5. 악용 방지 시스템 =====
      sectionTitle("5. \uC545\uC6A9 \uBC29\uC9C0 \uC2DC\uC2A4\uD15C"),
      bodyText("XP \uC2DC\uC2A4\uD15C\uC758 \uACF5\uC815\uC131\uC744 \uC704\uD574 \uB2E4\uC74C\uACFC \uAC19\uC740 \uBCF4\uC548 \uC7A5\uCE58\uAC00 \uC801\uC6A9\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4."),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2400, 3200, 3760],
        rows: [
          new TableRow({ children: [
            hCell("\uBCF4\uC548 \uC7A5\uCE58", 2400), hCell("\uBC29\uBC95", 3200), hCell("\uC124\uBA85", 3760)
          ]}),
          new TableRow({ children: [
            bCell("\uD83D\uDD12 \uC11C\uBC84 \uC804\uC6A9 \uC800\uC7A5", 2400, {bold:true}),
            bCell("XP\uB97C Supabase DB\uC5D0\uB9CC \uC800\uC7A5", 3200),
            bCell("\uBE0C\uB77C\uC6B0\uC800 localStorage \uC870\uC791\uC73C\uB85C XP \uBCC0\uACBD \uBD88\uAC00", 3760)
          ]}),
          new TableRow({ children: [
            bCell("\uD83D\uDEAB \uC911\uBCF5 \uBC29\uC9C0", 2400, {bold:true, shade:true}),
            bCell("JS \uCCB4\uD06C + DB UNIQUE \uC81C\uC57D", 3200, {shade:true}),
            bCell("\uAC19\uC740 \uCC55\uD130/\uD000\uC988 \uBC18\uBCF5 \uC2DC\uCCAD\uC73C\uB85C XP \uC911\uBCF5 \uD68D\uB4DD \uBD88\uAC00", 3760, {shade:true})
          ]}),
          new TableRow({ children: [
            bCell("\u23F0 \uCE6D\uCC2C \uC77C\uC77C \uC81C\uD55C", 2400, {bold:true}),
            bCell("DB \uD2B8\uB9AC\uAC70\uB85C \uC11C\uBC84\uC5D0\uC11C \uCC28\uB2E8", 3200),
            bCell("\uD558\uB8E8 2\uD68C, \uAC19\uC740 \uC0AC\uB78C 1\uD68C \u2014 \uC6B0\uD68C \uBD88\uAC00", 3760)
          ]}),
          new TableRow({ children: [
            bCell("\uD83D\uDE45 \uC790\uAE30 \uCE6D\uCC2C \uCC28\uB2E8", 2400, {bold:true, shade:true}),
            bCell("DB \uD2B8\uB9AC\uAC70\uB85C \uC11C\uBC84\uC5D0\uC11C \uCC28\uB2E8", 3200, {shade:true}),
            bCell("\uBCF8\uC778\uC5D0\uAC8C \uCE6D\uCC2C \uBCF4\uB0B4\uAE30 \uC2DC\uB3C4 \uC2DC \uC790\uB3D9 \uCC28\uB2E8", 3760, {shade:true})
          ]}),
          new TableRow({ children: [
            bCell("\uD83D\uDCCA \uC601\uC0C1 90% \uAE30\uC900", 2400, {bold:true}),
            bCell("\uC2DC\uCCAD \uC644\uB8CC \uBE44\uC728 \uD655\uC778 \uD6C4 XP \uC9C0\uAE09", 3200),
            bCell("\uC601\uC0C1 90% \uBBF8\uB9CC \uC2DC\uCCAD \uC2DC XP \uBBF8\uC9C0\uAE09 \u2014 \uBE68\uB9AC\uAC10\uAE30 \uBC29\uC9C0", 3760)
          ]}),
          new TableRow({ children: [
            bCell("\uD83D\uDCDD \uAD00\uB9AC\uC790 \uD2B9\uBCC4 \uC218\uC5EC", 2400, {bold:true, shade:true}),
            bCell("\uC0AC\uC720 \uD544\uC218 \uC785\uB825 + \uBC94\uC704 \uC81C\uD55C", 3200, {shade:true}),
            bCell("50~1,500 XP \uBC94\uC704 \uC81C\uD55C, \uC0AC\uC720 \uAE30\uB85D \uD544\uC218", 3760, {shade:true})
          ]}),
        ]
      }),

      // ===== 6. 관리자 설정 =====
      sectionTitle("6. \uAD00\uB9AC\uC790 \uC124\uC815 \uAC00\uC774\uB4DC"),
      bodyText("\uAD00\uB9AC\uC790\uB294 \uAD00\uB9AC\uC790 \uD398\uC774\uC9C0(\uC124\uC815)\uC5D0\uC11C \uB2E4\uC74C \uD56D\uBAA9\uC744 \uC870\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4:"),
      bullet("\uCE6D\uCC2C N\uAC1C\uB2F9 XP: \uAE30\uBCF8 15 XP (\uBCC0\uACBD \uAC00\uB2A5)"),
      bullet("\uBCF4\uB0B4\uAE30 XP: \uAE30\uBCF8 3 XP (\uBCC0\uACBD \uAC00\uB2A5)"),
      bullet("\uC804\uD658 \uD544\uC694 \uAC1C\uC218: \uAE30\uBCF8 2\uAC1C (\uBCC0\uACBD \uAC00\uB2A5)"),
      bullet("\uD558\uB8E8 \uBCF4\uB0B4\uAE30 \uC81C\uD55C: \uAE30\uBCF8 2\uD68C (\uBCC0\uACBD \uAC00\uB2A5)"),
      bullet("\uAC19\uC740 \uC0AC\uB78C \uD558\uB8E8 \uCD5C\uB300: \uAE30\uBCF8 1\uD68C (\uBCC0\uACBD \uAC00\uB2A5)"),
      spacer(100),
      bodyText("\uAD00\uB9AC\uC790\uB294 \uD2B9\uBCC4 XP \uC218\uC5EC \uAE30\uB2A5\uC744 \uD1B5\uD574 \uC6B0\uC218 \uC9C1\uC6D0\uC5D0\uAC8C \uC9C1\uC811 XP\uB97C \uC218\uC5EC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uC218\uC5EC \uC2DC \uC0AC\uC720\uB97C \uD568\uAED8 \uAE30\uB85D\uD574\uC57C \uD558\uBA70, 50~1,500 XP \uBC94\uC704 \uB0B4\uC5D0\uC11C\uB9CC \uAC00\uB2A5\uD569\uB2C8\uB2E4."),

      // ===== 7. FAQ =====
      sectionTitle("7. \uC790\uC8FC \uBB3B\uB294 \uC9C8\uBB38 (FAQ)"),

      subTitle("Q. XP\uB97C \uC9C1\uC811 \uC218\uC815\uD560 \uC218 \uC788\uB098\uC694?"),
      bodyText("\uC544\uB2C8\uC694. XP\uB294 \uC11C\uBC84 \uB370\uC774\uD130\uBCA0\uC774\uC2A4\uC5D0\uB9CC \uC800\uC7A5\uB418\uBA70, \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C \uC870\uC791\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uAD00\uB9AC\uC790\uB9CC \uD2B9\uBCC4 \uC218\uC5EC \uAE30\uB2A5\uC744 \uD1B5\uD574 XP\uB97C \uBD80\uC5EC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."),

      subTitle("Q. \uAC19\uC740 \uC601\uC0C1\uC744 \uC5EC\uB7EC \uBC88 \uBCF4\uBA74 XP\uAC00 \uC911\uBCF5\uB418\uB098\uC694?"),
      bodyText("\uC544\uB2C8\uC694. \uAC01 \uCC55\uD130\uB2F9 1\uD68C\uB9CC XP\uAC00 \uC9C0\uAE09\uB429\uB2C8\uB2E4. \uB370\uC774\uD130\uBCA0\uC774\uC2A4 UNIQUE \uC81C\uC57D\uC73C\uB85C \uC911\uBCF5 \uC801\uB9BD\uC774 \uBD88\uAC00\uB2A5\uD569\uB2C8\uB2E4."),

      subTitle("Q. \uCE6D\uCC2C\uC744 \uC11C\uB85C \uB3CC\uB824\uAC00\uBA70 \uC545\uC6A9\uD560 \uC218 \uC788\uB098\uC694?"),
      bodyText("\uD558\uB8E8 \uCD5C\uB300 2\uD68C, \uAC19\uC740 \uC0AC\uB78C\uC5D0\uAC8C 1\uD68C\uB9CC \uAC00\uB2A5\uD558\uBBC0\uB85C \uC545\uC6A9\uC774 \uC81C\uD55C\uB429\uB2C8\uB2E4. \uC774 \uC81C\uD55C\uC740 \uC11C\uBC84 DB \uD2B8\uB9AC\uAC70\uB85C \uAD00\uB9AC\uB418\uC5B4 \uC6B0\uD68C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."),

      subTitle("Q. \uB4F1\uAE09\uC774 \uB0B4\uB824\uAC00\uB098\uC694?"),
      bodyText("\uC544\uB2C8\uC694. XP\uB294 \uD55C\uBC88 \uC5BB\uC73C\uBA74 \uCC28\uAC10\uB418\uC9C0 \uC54A\uC73C\uBA70, \uB4F1\uAE09\uB3C4 \uD558\uB77D\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."),

      subTitle("Q. \uB9AC\uB354\uBCF4\uB4DC\uB294 \uC5B4\uB5BB\uAC8C \uC815\uD574\uC9C0\uB098\uC694?"),
      bodyText("XP \uCD1D\uD569 \uAE30\uC900\uC73C\uB85C \uC804\uCCB4 \uC9C1\uC6D0 \uC21C\uC704\uAC00 \uD45C\uC2DC\uB429\uB2C8\uB2E4. \uD648 \uD654\uBA74\uC5D0\uC11C \uC2E4\uC2DC\uAC04\uC73C\uB85C \uD655\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."),

      spacer(200),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC", space: 8 } },
        spacing: { before: 200 },
        children: [new TextRun({ text: "SOP Training System \u2014 \uACF5\uC815\uD558\uACE0 \uD22C\uBA85\uD55C \uC131\uC7A5 \uC2DC\uC2A4\uD15C", font: "Arial", size: 20, color: "999999", italics: true })]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  const outPath = "C:\\Claude\\AI sop training system\\docs\\XP_칭찬_시스템_가이드.docx";
  fs.writeFileSync(outPath, buffer);
  console.log("Created:", outPath, "(" + buffer.length + " bytes)");
});
