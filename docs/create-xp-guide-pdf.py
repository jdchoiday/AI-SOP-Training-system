from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                 PageBreak, KeepTogether)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

# 한글 폰트 등록
font_path = "C:/Windows/Fonts/malgun.ttf"
font_bold_path = "C:/Windows/Fonts/malgunbd.ttf"
if os.path.exists(font_path):
    pdfmetrics.registerFont(TTFont('Malgun', font_path))
    pdfmetrics.registerFont(TTFont('MalgunBold', font_bold_path))
    FONT = 'Malgun'
    FONT_B = 'MalgunBold'
else:
    FONT = 'Helvetica'
    FONT_B = 'Helvetica-Bold'

# Colors
BLUE = HexColor('#2E5090')
LIGHT_BLUE = HexColor('#3A6EA5')
GREEN = HexColor('#2E7D32')
ORANGE = HexColor('#E65100')
GRAY = HexColor('#666666')
LIGHT_GRAY = HexColor('#999999')
DARK = HexColor('#333333')
BG_BLUE = HexColor('#2E5090')
BG_LIGHT = HexColor('#F2F7FB')
BG_WHITE = HexColor('#FFFFFF')
BORDER = HexColor('#CCCCCC')

out_path = r"C:\Claude\AI sop training system\docs\XP_칭찬_시스템_가이드.pdf"

doc = SimpleDocTemplate(out_path, pagesize=A4,
                        topMargin=25*mm, bottomMargin=20*mm,
                        leftMargin=20*mm, rightMargin=20*mm)

styles = getSampleStyleSheet()

# Custom styles
s_title = ParagraphStyle('CTitle', fontName=FONT_B, fontSize=24, textColor=BLUE,
                         alignment=TA_CENTER, spaceAfter=6*mm)
s_subtitle = ParagraphStyle('CSubtitle', fontName=FONT, fontSize=14, textColor=LIGHT_BLUE,
                            alignment=TA_CENTER, spaceAfter=4*mm)
s_h1 = ParagraphStyle('CH1', fontName=FONT_B, fontSize=16, textColor=BLUE,
                       spaceBefore=10*mm, spaceAfter=4*mm,
                       borderWidth=0, borderPadding=0)
s_h2 = ParagraphStyle('CH2', fontName=FONT_B, fontSize=13, textColor=LIGHT_BLUE,
                       spaceBefore=6*mm, spaceAfter=3*mm)
s_body = ParagraphStyle('CBody', fontName=FONT, fontSize=10, textColor=DARK,
                         leading=16, spaceAfter=3*mm)
s_bullet = ParagraphStyle('CBullet', fontName=FONT, fontSize=10, textColor=DARK,
                           leading=15, spaceAfter=1.5*mm,
                           leftIndent=10*mm, bulletIndent=4*mm)
s_info = ParagraphStyle('CInfo', fontName=FONT, fontSize=10, textColor=BLUE,
                         leading=15, spaceAfter=4*mm, leftIndent=8*mm,
                         borderLeftWidth=3, borderLeftColor=BLUE, borderPadding=6)
s_small = ParagraphStyle('CSmall', fontName=FONT, fontSize=9, textColor=LIGHT_GRAY,
                          alignment=TA_CENTER)
s_header_cell = ParagraphStyle('HCell', fontName=FONT_B, fontSize=9, textColor=HexColor('#FFFFFF'),
                                alignment=TA_CENTER, leading=13)
s_cell = ParagraphStyle('BCell', fontName=FONT, fontSize=9, textColor=DARK, leading=13)
s_cell_c = ParagraphStyle('BCellC', fontName=FONT, fontSize=9, textColor=DARK,
                           alignment=TA_CENTER, leading=13)
s_cell_b = ParagraphStyle('BCellB', fontName=FONT_B, fontSize=9, textColor=DARK,
                           alignment=TA_CENTER, leading=13)
s_cell_g = ParagraphStyle('BCellG', fontName=FONT_B, fontSize=9, textColor=GREEN,
                           alignment=TA_CENTER, leading=13)
s_cell_o = ParagraphStyle('BCellO', fontName=FONT_B, fontSize=9, textColor=ORANGE,
                           alignment=TA_CENTER, leading=13)
s_cell_bl = ParagraphStyle('BCellBl', fontName=FONT_B, fontSize=9, textColor=BLUE,
                            alignment=TA_CENTER, leading=13)

def make_table(header, rows, col_widths):
    data = [[Paragraph(c, s_header_cell) for c in header]]
    for row in rows:
        data.append(row)
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), BG_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#FFFFFF')),
        ('FONTNAME', (0, 0), (-1, 0), FONT_B),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]
    # Alternate row shading
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), BG_LIGHT))
    t.setStyle(TableStyle(style_cmds))
    return t

story = []

# ===== COVER =====
story.append(Spacer(1, 40*mm))
story.append(Paragraph("🏆", ParagraphStyle('emoji', fontSize=40, alignment=TA_CENTER, spaceAfter=8*mm)))
story.append(Paragraph("SOP Training System", s_title))
story.append(Paragraph("XP 포인트 &amp; 칭찬 시스템 가이드", s_subtitle))
story.append(Spacer(1, 6*mm))
story.append(Paragraph("직원 및 경영진을 위한 운영 가이드", ParagraphStyle('sub2', fontName=FONT, fontSize=12, textColor=GRAY, alignment=TA_CENTER, spaceAfter=10*mm)))
story.append(Paragraph("문서 버전: v1.0  |  작성일: 2026년 4월 12일", s_small))
story.append(PageBreak())

# ===== 1. 시스템 개요 =====
story.append(Paragraph("1. 시스템 개요", s_h1))
story.append(Paragraph("SOP Training System은 직원 교육을 게임화(Gamification)하여 학습 동기를 부여하는 시스템입니다.", s_body))
story.append(Paragraph("직원들은 SOP 영상 학습, 퀴즈, 칭찬 활동을 통해 XP(경험치)를 적립하고, 축적된 XP에 따라 등급(티어)이 상승합니다.", s_body))
story.append(Paragraph("핵심 원칙: 진짜 학습과 협업에만 XP를 부여합니다. 모든 XP는 서버에 기록되며, 조작이 불가능합니다.", s_info))

# ===== 2. XP 획득 기준 =====
story.append(Paragraph("2. XP 획득 기준", s_h1))
story.append(Paragraph("XP를 얻을 수 있는 활동과 각 활동별 포인트 기준은 다음과 같습니다.", s_body))

cw1 = [14*mm, 42*mm, 22*mm, 72*mm, 22*mm]
story.append(make_table(
    ["#", "활동", "XP", "설명", "회수"],
    [
        [Paragraph("📺", s_cell_c), Paragraph("챕터 영상 학습 완료", s_cell),
         Paragraph("+50 XP", s_cell_g), Paragraph("SOP 영상을 90% 이상 시청 완료 시 자동 지급", s_cell),
         Paragraph("챕터당 1회", s_cell_c)],
        [Paragraph("✅", s_cell_c), Paragraph("퀴즈 정답", s_cell),
         Paragraph("+10 XP", s_cell_g), Paragraph("챕터 퀴즈에서 정답 1개당 10 XP 지급", s_cell),
         Paragraph("정답당", s_cell_c)],
        [Paragraph("💯", s_cell_c), Paragraph("퀴즈 만점 보너스", s_cell),
         Paragraph("+30 XP", s_cell_g), Paragraph("챕터 퀴즈 전문 정답 시 추가 보너스 지급", s_cell),
         Paragraph("챕터당 1회", s_cell_c)],
        [Paragraph("🎓", s_cell_c), Paragraph("전체 과정 완주", s_cell),
         Paragraph("+200 XP", s_cell_bl), Paragraph("모든 챕터의 영상 + 퀴즈를 완료했을 때 지급", s_cell),
         Paragraph("1회", s_cell_c)],
        [Paragraph("🤝", s_cell_c), Paragraph("칭찬 보내기", s_cell),
         Paragraph("+3 XP", s_cell_g), Paragraph("동료에게 칭찬을 보낼 때마다 보내는 사람에게 지급", s_cell),
         Paragraph("하루 2회", s_cell_c)],
        [Paragraph("⭐", s_cell_c), Paragraph("칭찬 2개 모으기", s_cell),
         Paragraph("+15 XP", s_cell_g), Paragraph("칭찬을 2개 받을 때마다 받는 사람에게 자동 전환", s_cell),
         Paragraph("무제한", s_cell_c)],
        [Paragraph("🏅", s_cell_c), Paragraph("관리자 특별 수여", s_cell),
         Paragraph("50~1,500", s_cell_o), Paragraph("관리자가 우수 직원에게 직접 수여 (사유 필수 입력)", s_cell),
         Paragraph("수동", s_cell_c)],
    ],
    cw1
))

# 시뮬레이션
story.append(Paragraph("2-1. XP 시뮬레이션 예시", s_h2))
story.append(Paragraph("챕터 5개, 퀴즈 3문제/챕터 기준으로 성실히 학습한 직원의 예상 XP:", s_body))

cw2 = [55*mm, 25*mm, 25*mm, 67*mm]
story.append(make_table(
    ["항목", "계산", "XP", "비고"],
    [
        [Paragraph("챕터 5개 영상 시청", s_cell), Paragraph("50 × 5", s_cell_c),
         Paragraph("250 XP", s_cell_b), Paragraph("", s_cell)],
        [Paragraph("퀴즈 정답 (15문제 중 12개)", s_cell), Paragraph("10 × 12", s_cell_c),
         Paragraph("120 XP", s_cell_b), Paragraph("80% 정답률", s_cell)],
        [Paragraph("만점 보너스 (2개 챕터 만점)", s_cell), Paragraph("30 × 2", s_cell_c),
         Paragraph("60 XP", s_cell_b), Paragraph("", s_cell)],
        [Paragraph("전체 과정 완주 보너스", s_cell), Paragraph("—", s_cell_c),
         Paragraph("200 XP", s_cell_b), Paragraph("1회성", s_cell)],
        [Paragraph("칭찬 보내기 (10회)", s_cell), Paragraph("3 × 10", s_cell_c),
         Paragraph("30 XP", s_cell_b), Paragraph("", s_cell)],
        [Paragraph("칭찬 받기 (6개 → 3스택)", s_cell), Paragraph("15 × 3", s_cell_c),
         Paragraph("45 XP", s_cell_b), Paragraph("", s_cell)],
        [Paragraph("<b>합계</b>", s_cell), Paragraph("", s_cell),
         Paragraph("705 XP", s_cell_bl), Paragraph("→ 성장 등급 도달", s_cell)],
    ],
    cw2
))

# ===== 3. 등급(티어) 시스템 =====
story.append(Paragraph("3. 등급(티어) 시스템", s_h1))
story.append(Paragraph("축적된 XP에 따라 9단계 등급이 부여됩니다. 각 등급은 IV → III → II → I의 4단계 세부 레벨이 있습니다.", s_body))

cw3 = [12*mm, 12*mm, 22*mm, 22*mm, 22*mm, 28*mm, 22*mm, 28*mm]
story.append(make_table(
    ["단계", "", "한국어", "English", "Vietnamese", "필요 XP", "", "목표 기간"],
    [
        [Paragraph("1", s_cell_c), Paragraph("🌱", s_cell_c), Paragraph("새싹", s_cell),
         Paragraph("Sprout", s_cell), Paragraph("Mầm Non", s_cell),
         Paragraph("0 XP", s_cell_c), Paragraph("", s_cell_c), Paragraph("가입 시 자동", s_cell_c)],
        [Paragraph("2", s_cell_c), Paragraph("🥉", s_cell_c), Paragraph("성장", s_cell),
         Paragraph("Growing", s_cell), Paragraph("Đang Lớn", s_cell),
         Paragraph("500 XP", s_cell_c), Paragraph("", s_cell_c), Paragraph("~2주", s_cell_c)],
        [Paragraph("3", s_cell_c), Paragraph("⭐", s_cell_c), Paragraph("빛나는", s_cell),
         Paragraph("Shining", s_cell), Paragraph("Tỏa Sáng", s_cell),
         Paragraph("1,500 XP", s_cell_c), Paragraph("", s_cell_c), Paragraph("~1개월", s_cell_c)],
        [Paragraph("4", s_cell_c), Paragraph("🌟", s_cell_c), Paragraph("황금별", s_cell),
         Paragraph("Gold Star", s_cell), Paragraph("Ngôi Sao Vàng", s_cell),
         Paragraph("3,500 XP", s_cell_c), Paragraph("", s_cell_c), Paragraph("~2개월", s_cell_c)],
        [Paragraph("5", s_cell_c), Paragraph("💎", s_cell_c), Paragraph("정예", s_cell),
         Paragraph("Elite", s_cell), Paragraph("Tinh Nhuệ", s_cell),
         Paragraph("7,000 XP", s_cell_c), Paragraph("", s_cell_c), Paragraph("~4개월", s_cell_c)],
        [Paragraph("6", s_cell_c), Paragraph("👑", s_cell_c), Paragraph("챔피언", s_cell),
         Paragraph("Champion", s_cell), Paragraph("Nhà Vô Địch", s_cell),
         Paragraph("13,000 XP", s_cell_c), Paragraph("", s_cell_c), Paragraph("~6개월", s_cell_c)],
        [Paragraph("7", s_cell_c), Paragraph("🔮", s_cell_c), Paragraph("전설", s_cell),
         Paragraph("Legend", s_cell), Paragraph("Huyền Thoại", s_cell),
         Paragraph("22,000 XP", s_cell_c), Paragraph("", s_cell_c), Paragraph("~10개월", s_cell_c)],
        [Paragraph("8", s_cell_c), Paragraph("🔥", s_cell_c), Paragraph("불꽃", s_cell),
         Paragraph("Blaze", s_cell), Paragraph("Ngọn Lửa", s_cell),
         Paragraph("35,000 XP", s_cell_c), Paragraph("", s_cell_c), Paragraph("~14개월", s_cell_c)],
        [Paragraph("9", s_cell_c), Paragraph("⚡", s_cell_c),
         Paragraph("<b><font color='#E65100'>키우자 신</font></b>", s_cell),
         Paragraph("<font color='#E65100'>Kiwooza God</font>", s_cell),
         Paragraph("<font color='#E65100'>Thần Kiwooza</font>", s_cell),
         Paragraph("<font color='#E65100'>50,000 XP</font>", s_cell_c),
         Paragraph("", s_cell_c),
         Paragraph("<b><font color='#E65100'>최고 등급</font></b>", s_cell_c)],
    ],
    cw3
))

# ===== 4. 칭찬 시스템 =====
story.append(Paragraph("4. 칭찬 시스템", s_h1))
story.append(Paragraph("4-1. 칭찬 규칙", s_h2))

cw4 = [45*mm, 127*mm]
story.append(make_table(
    ["항목", "규칙"],
    [
        [Paragraph("하루 보내기 제한", s_cell), Paragraph("하루 최대 2회 (전체 대상 합산)", s_cell)],
        [Paragraph("같은 사람 제한", s_cell), Paragraph("같은 동료에게 하루 최대 1회", s_cell)],
        [Paragraph("자기 칭찬 금지", s_cell), Paragraph("본인에게 칭찬 보내기 불가 (서버에서 차단)", s_cell)],
        [Paragraph("XP 전환 (보내는 사람)", s_cell), Paragraph("칭찬 1회 보낼 때마다 +3 XP 자동 지급", s_cell)],
        [Paragraph("XP 전환 (받는 사람)", s_cell), Paragraph("칭찬 2개 모일 때마다 +15 XP 자동 전환", s_cell)],
    ],
    cw4
))

story.append(Paragraph("4-2. 칭찬 흐름 예시", s_h2))
story.append(Paragraph("① 김민수님이 박지은님에게 칭찬 보냄 → 김민수 +3 XP", s_body))
story.append(Paragraph("② 이영희님이 박지은님에게 칭찬 보냄 → 이영희 +3 XP", s_body))
story.append(Paragraph("③ 박지은님 칭찬 2개 달성! → 박지은 +15 XP 자동 전환", s_body))
story.append(Paragraph("칭찬은 선순환 구조입니다. 보내는 사람도 XP를 받고, 받는 사람도 모이면 XP로 전환됩니다.", s_info))

# ===== 5. 악용 방지 시스템 =====
story.append(Paragraph("5. 악용 방지 시스템", s_h1))
story.append(Paragraph("XP 시스템의 공정성을 위해 다음과 같은 보안 장치가 적용되어 있습니다.", s_body))

cw5 = [35*mm, 50*mm, 87*mm]
story.append(make_table(
    ["보안 장치", "방법", "설명"],
    [
        [Paragraph("🔒 서버 전용 저장", s_cell), Paragraph("XP를 Supabase DB에만 저장", s_cell),
         Paragraph("브라우저 localStorage 조작으로 XP 변경 불가", s_cell)],
        [Paragraph("🚫 중복 방지", s_cell), Paragraph("JS 체크 + DB UNIQUE 제약", s_cell),
         Paragraph("같은 챕터/퀴즈 반복 시청으로 XP 중복 획득 불가", s_cell)],
        [Paragraph("⏰ 칭찬 일일 제한", s_cell), Paragraph("DB 트리거로 서버에서 차단", s_cell),
         Paragraph("하루 2회, 같은 사람 1회 — 우회 불가", s_cell)],
        [Paragraph("🙅 자기 칭찬 차단", s_cell), Paragraph("DB 트리거로 서버에서 차단", s_cell),
         Paragraph("본인에게 칭찬 보내기 시도 시 자동 차단", s_cell)],
        [Paragraph("📊 영상 90% 기준", s_cell), Paragraph("시청 완료 비율 확인 후 XP 지급", s_cell),
         Paragraph("영상 90% 미만 시청 시 XP 미지급 — 빨리감기 방지", s_cell)],
        [Paragraph("📝 관리자 특별 수여", s_cell), Paragraph("사유 필수 입력 + 범위 제한", s_cell),
         Paragraph("50~1,500 XP 범위 제한, 사유 기록 필수", s_cell)],
    ],
    cw5
))

# ===== 6. 관리자 설정 =====
story.append(Paragraph("6. 관리자 설정 가이드", s_h1))
story.append(Paragraph("관리자는 관리자 페이지(설정)에서 다음 항목을 조정할 수 있습니다:", s_body))
for item in [
    "칭찬 N개당 XP: 기본 15 XP (변경 가능)",
    "보내기 XP: 기본 3 XP (변경 가능)",
    "전환 필요 개수: 기본 2개 (변경 가능)",
    "하루 보내기 제한: 기본 2회 (변경 가능)",
    "같은 사람 하루 최대: 기본 1회 (변경 가능)",
]:
    story.append(Paragraph(f"• {item}", s_bullet))

story.append(Spacer(1, 4*mm))
story.append(Paragraph("관리자는 특별 XP 수여 기능을 통해 우수 직원에게 직접 XP를 수여할 수 있습니다. 수여 시 사유를 함께 기록해야 하며, 50~1,500 XP 범위 내에서만 가능합니다.", s_body))

# ===== 7. FAQ =====
story.append(Paragraph("7. 자주 묻는 질문 (FAQ)", s_h1))

faqs = [
    ("Q. XP를 직접 수정할 수 있나요?",
     "아니요. XP는 서버 데이터베이스에만 저장되며, 브라우저에서 조작할 수 없습니다. 관리자만 특별 수여 기능을 통해 XP를 부여할 수 있습니다."),
    ("Q. 같은 영상을 여러 번 보면 XP가 중복되나요?",
     "아니요. 각 챕터당 1회만 XP가 지급됩니다. 데이터베이스 UNIQUE 제약으로 중복 적립이 불가능합니다."),
    ("Q. 칭찬을 서로 돌려가며 악용할 수 있나요?",
     "하루 최대 2회, 같은 사람에게 1회만 가능하므로 악용이 제한됩니다. 이 제한은 서버 DB 트리거로 관리되어 우회할 수 없습니다."),
    ("Q. 등급이 내려가나요?",
     "아니요. XP는 한번 얻으면 차감되지 않으며, 등급도 하락하지 않습니다."),
    ("Q. 리더보드는 어떻게 정해지나요?",
     "XP 총합 기준으로 전체 직원 순위가 표시됩니다. 홈 화면에서 실시간으로 확인할 수 있습니다."),
]

for q, a in faqs:
    story.append(Paragraph(q, s_h2))
    story.append(Paragraph(a, s_body))

# Footer
story.append(Spacer(1, 10*mm))
story.append(Paragraph("SOP Training System — 공정하고 투명한 성장 시스템", s_small))

# Build
doc.build(story)
print(f"Created: {out_path}")
