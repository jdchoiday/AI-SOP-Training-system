// ============================================
// 키즈카페/테마파크 SOP 콘텐츠
// 대상: 신입 직원 (파트타임 포함)
// 언어: 한국어 + 베트남어
// ============================================

const KIDS_SOP_CONTENT = [

  // ===== SOP 1: 출근 및 매장 오픈 =====
  {
    id: 'kids-sop-open',
    title: '출근 및 매장 오픈 절차',
    title_en: 'Check-in & Store Opening',
    title_vn: 'Chấm công & Mở cửa hàng',
    category: '오프닝',
    order_num: 1,
    content: `<h3>1. 출근 및 준비</h3>
<ol>
<li>근무 시작 15분 전까지 도착합니다</li>
<li>직원 출입구로 입장하여 출근 체크인을 합니다</li>
<li>유니폼으로 갈아입고 명찰을 착용합니다</li>
<li>긴 머리는 묶고, 액세서리(반지, 목걸이, 긴 귀걸이)를 제거합니다 — 아이들 안전을 위해</li>
<li>손을 비누로 20초 이상 깨끗이 씻습니다</li>
</ol>

<h3>2. 놀이공간 안전 점검</h3>
<ol>
<li>모든 놀이기구를 육안으로 확인합니다 (파손, 날카로운 부분, 느슨한 볼트)</li>
<li>볼풀: 이물질(쓰레기, 음식물, 날카로운 물건) 제거</li>
<li>트램펄린/슬라이드: 패딩 상태, 안전네트 확인</li>
<li>바닥: 미끄러운 곳, 물기 확인 → 즉시 건조</li>
<li>비상구: 통로 확보, 표시등 점등 확인</li>
<li>이상 발견 시 → 매니저에게 즉시 보고 + 해당 구역 사용 금지 표시</li>
</ol>

<h3>3. 위생 청소</h3>
<ol>
<li>바닥: 빗자루 → 물걸레 → 소독 (순서 지킬 것)</li>
<li>놀이기구 표면: 아이 접촉이 많은 손잡이, 레일 등 소독</li>
<li>화장실: 변기, 세면대, 거울 청소 + 비품(휴지, 비누) 보충</li>
<li>키즈 식당/카페 영역: 테이블, 의자, 유아의자 소독</li>
<li>쓰레기통 비우기 및 새 봉투 교체</li>
</ol>

<h3>4. 오픈 최종 확인</h3>
<ol>
<li>조명, 음악, 공조(에어컨/히터) 세팅</li>
<li>양말 자판기 / 입장 팔찌 시스템 작동 확인</li>
<li>POS 시스템 및 결제 단말기 테스트</li>
<li>안내 표지판 배치 (이용규칙, 가격표, 연령 제한)</li>
<li>직원 배치 확인: 입구, 놀이공간, 카페, 순회 각 1명 이상</li>
</ol>

<p><strong>⚠️ 주의:</strong> 오픈 30분 전까지 모든 점검을 완료해야 합니다. 안전 점검에서 이상이 발견되면 해당 구역은 수리 완료 전까지 절대 개방하지 않습니다.</p>`,

    content_vn: `<h3>1. Chấm công & Chuẩn bị</h3>
<ol>
<li>Đến trước giờ làm 15 phút</li>
<li>Vào cửa nhân viên và chấm công</li>
<li>Mặc đồng phục và đeo bảng tên</li>
<li>Buộc tóc dài, tháo phụ kiện (nhẫn, dây chuyền, hoa tai dài) — vì an toàn của trẻ</li>
<li>Rửa tay bằng xà phòng ít nhất 20 giây</li>
</ol>

<h3>2. Kiểm tra an toàn khu vui chơi</h3>
<ol>
<li>Kiểm tra bằng mắt tất cả thiết bị (hư hỏng, cạnh sắc, ốc lỏng)</li>
<li>Hồ bóng: loại bỏ vật lạ (rác, thức ăn, vật sắc nhọn)</li>
<li>Bạt nhún/Cầu trượt: kiểm tra đệm, lưới an toàn</li>
<li>Sàn nhà: kiểm tra chỗ trơn, nước đọng → lau khô ngay</li>
<li>Lối thoát hiểm: đường đi thông thoáng, đèn báo sáng</li>
<li>Phát hiện bất thường → báo quản lý ngay + cấm sử dụng khu vực đó</li>
</ol>

<h3>3. Vệ sinh</h3>
<ol>
<li>Sàn: quét → lau ướt → khử trùng (theo đúng thứ tự)</li>
<li>Bề mặt thiết bị: khử trùng tay nắm, thanh vịn mà trẻ hay chạm</li>
<li>Nhà vệ sinh: bồn cầu, chậu rửa, gương + bổ sung giấy, xà phòng</li>
<li>Khu ăn uống: khử trùng bàn, ghế, ghế trẻ em</li>
<li>Đổ rác và thay túi mới</li>
</ol>

<h3>4. Kiểm tra cuối trước khi mở cửa</h3>
<ol>
<li>Cài đặt đèn, nhạc, điều hòa</li>
<li>Kiểm tra máy bán vớ / hệ thống vòng tay vào cổng</li>
<li>Test hệ thống POS và máy thanh toán</li>
<li>Đặt biển hướng dẫn (nội quy, bảng giá, giới hạn tuổi)</li>
<li>Xác nhận vị trí nhân viên: cổng, khu chơi, quán cafe, tuần tra mỗi nơi ít nhất 1 người</li>
</ol>

<p><strong>⚠️ Lưu ý:</strong> Hoàn thành tất cả kiểm tra trước giờ mở cửa 30 phút. Nếu phát hiện bất thường về an toàn, TUYỆT ĐỐI không mở khu vực đó cho đến khi sửa xong.</p>`,

    quizzes: [
      { question: '출근 후 가장 먼저 해야 할 것은?', question_vn: 'Việc đầu tiên sau khi đến?', options: ['놀이기구 점검', '출근 체크인 + 유니폼 착용', '바닥 청소', '음악 틀기'], options_vn: ['Kiểm tra thiết bị', 'Chấm công + mặc đồng phục', 'Lau sàn', 'Bật nhạc'], correct: 1 },
      { question: '액세서리를 제거하는 이유는?', question_vn: 'Tại sao phải tháo phụ kiện?', options: ['미관상', '아이들 안전', '위생 규정', '유니폼 정책'], options_vn: ['Thẩm mỹ', 'An toàn trẻ em', 'Quy định vệ sinh', 'Chính sách đồng phục'], correct: 1 },
      { question: '볼풀에서 확인해야 할 것은?', question_vn: 'Cần kiểm tra gì ở hồ bóng?', options: ['공 개수', '이물질/날카로운 물건', '공 색상', '깊이'], options_vn: ['Số lượng bóng', 'Vật lạ/vật sắc nhọn', 'Màu bóng', 'Độ sâu'], correct: 1 },
      { question: '안전 점검에서 이상 발견 시 올바른 조치는?', question_vn: 'Khi phát hiện bất thường, xử lý đúng là?', options: ['직접 수리', '매니저 보고 + 구역 사용 금지', '무시', '다음 날 처리'], options_vn: ['Tự sửa', 'Báo quản lý + cấm sử dụng', 'Bỏ qua', 'Xử lý ngày mai'], correct: 1 },
      { question: '오픈 준비 완료 시한은?', question_vn: 'Phải chuẩn bị xong trước mấy phút?', options: ['직전', '10분 전', '30분 전', '1시간 전'], options_vn: ['Ngay trước', '10 phút', '30 phút', '1 tiếng'], correct: 2 },
    ]
  },

  // ===== SOP 2: 고객(보호자+아이) 응대 =====
  {
    id: 'kids-sop-service',
    title: '고객(보호자+아이) 응대',
    title_en: 'Customer Service (Parents & Kids)',
    title_vn: 'Phục vụ khách (Phụ huynh & Trẻ em)',
    category: '고객 응대',
    order_num: 2,
    content: `<h3>1. 입장 안내</h3>
<ol>
<li>밝은 미소와 눈 맞춤으로 인사합니다: "안녕하세요! 어서오세요~"</li>
<li>이용 인원과 아이 나이를 확인합니다</li>
<li>양말 착용 여부 확인 — 미착용 시 양말 구매 안내</li>
<li>이용 요금과 시간을 명확히 안내합니다</li>
<li>안전 수칙을 간단히 설명합니다: "보호자 분은 반드시 함께 계셔야 합니다"</li>
<li>입장 팔찌/스탬프를 채워드립니다</li>
<li>신발장, 사물함 위치를 안내합니다</li>
</ol>

<h3>2. 놀이공간에서의 안내</h3>
<ol>
<li>아이의 연령에 맞는 놀이 구역을 안내합니다 (영유아존/유아존/키즈존 구분)</li>
<li>"이 기구는 00세 이상부터 이용 가능해요" 등 연령 제한 안내</li>
<li>위험 행동 발견 시 부드럽게 제지합니다: "여기서는 이렇게 하면 더 안전해요~"</li>
<li>보호자 없이 아이만 있을 경우 → 보호자를 찾아 동반 요청</li>
</ol>

<h3>3. 불만/컴플레인 처리</h3>
<ol>
<li>경청: 보호자의 말을 끊지 않고 끝까지 듣습니다</li>
<li>공감: "불편하셨겠습니다. 죄송합니다."</li>
<li>해결: 가능한 범위에서 즉시 조치합니다</li>
<li>인계: 해결이 어려우면 매니저에게 인계합니다</li>
<li>기록: 상황을 컴플레인 기록지에 작성합니다</li>
</ol>

<p><strong>⚠️ 절대 하면 안 되는 것:</strong></p>
<ol>
<li>아이를 직접 혼내거나 큰 소리를 내는 것</li>
<li>보호자와 논쟁하는 것</li>
<li>"규정이라서요"로 대화를 끝내는 것</li>
<li>아이를 동의 없이 만지는 것 (안전 긴급상황 제외)</li>
</ol>

<h3>4. 퇴장 안내</h3>
<ol>
<li>이용 시간 10분 전에 미리 안내합니다: "10분 후에 이용 시간이 종료됩니다"</li>
<li>퇴장 시 팔찌 회수, 소지품 확인 안내</li>
<li>"감사합니다, 또 놀러 오세요~" 밝게 인사</li>
<li>연장 희망 시 추가 요금 안내</li>
</ol>`,

    content_vn: `<h3>1. Hướng dẫn vào cổng</h3>
<ol>
<li>Chào với nụ cười tươi và giao tiếp mắt: "Xin chào! Chào mừng đến!"</li>
<li>Xác nhận số người và tuổi của trẻ</li>
<li>Kiểm tra mang vớ — nếu không có, hướng dẫn mua vớ</li>
<li>Thông báo rõ giá và thời gian sử dụng</li>
<li>Giải thích ngắn gọn nội quy an toàn: "Phụ huynh phải ở cùng trẻ"</li>
<li>Đeo vòng tay/đóng dấu cho khách</li>
<li>Hướng dẫn vị trí tủ giày, tủ đồ</li>
</ol>

<h3>2. Hướng dẫn trong khu vui chơi</h3>
<ol>
<li>Hướng dẫn khu vui chơi phù hợp lứa tuổi (khu sơ sinh/mẫu giáo/thiếu nhi)</li>
<li>Thông báo giới hạn tuổi: "Thiết bị này dành cho trẻ từ X tuổi trở lên"</li>
<li>Nhẹ nhàng nhắc nhở khi thấy hành vi nguy hiểm: "Chơi thế này sẽ an toàn hơn nhé~"</li>
<li>Trẻ ở một mình không có phụ huynh → tìm phụ huynh và yêu cầu đi cùng</li>
</ol>

<h3>3. Xử lý khiếu nại</h3>
<ol>
<li>Lắng nghe: không ngắt lời phụ huynh</li>
<li>Đồng cảm: "Xin lỗi vì sự bất tiện."</li>
<li>Giải quyết: xử lý ngay trong khả năng</li>
<li>Chuyển tiếp: nếu khó giải quyết, chuyển cho quản lý</li>
<li>Ghi chép: viết lại tình huống vào sổ ghi nhận</li>
</ol>

<p><strong>⚠️ TUYỆT ĐỐI KHÔNG:</strong></p>
<ol>
<li>Mắng hoặc la trẻ</li>
<li>Tranh cãi với phụ huynh</li>
<li>Kết thúc bằng "Đó là quy định"</li>
<li>Chạm vào trẻ mà không được đồng ý (trừ tình huống khẩn cấp)</li>
</ol>

<h3>4. Hướng dẫn ra về</h3>
<ol>
<li>Nhắc trước 10 phút: "Còn 10 phút nữa là hết giờ chơi"</li>
<li>Thu hồi vòng tay, nhắc kiểm tra đồ đạc</li>
<li>"Cảm ơn, hẹn gặp lại nhé~" chào tươi vui</li>
<li>Nếu muốn gia hạn, thông báo phí thêm</li>
</ol>`,

    quizzes: [
      { question: '입장 시 반드시 확인해야 할 것은?', question_vn: 'Phải kiểm tra gì khi khách vào?', options: ['아이 키', '양말 착용 여부', '핸드폰', '가방'], options_vn: ['Chiều cao', 'Mang vớ hay không', 'Điện thoại', 'Túi xách'], correct: 1 },
      { question: '보호자 없이 아이만 놀고 있을 때?', question_vn: 'Khi trẻ chơi một mình không có phụ huynh?', options: ['그냥 두기', '보호자를 찾아 동반 요청', '아이를 내보내기', '사진 찍기'], options_vn: ['Để yên', 'Tìm phụ huynh đi cùng', 'Đưa trẻ ra ngoài', 'Chụp ảnh'], correct: 1 },
      { question: '아이가 위험한 행동을 할 때 올바른 대응은?', question_vn: 'Khi trẻ có hành vi nguy hiểm?', options: ['큰 소리로 혼내기', '부드럽게 안전한 방법 안내', '무시하기', '보호자에게만 말하기'], options_vn: ['La mắng to', 'Nhẹ nhàng hướng dẫn cách an toàn', 'Bỏ qua', 'Chỉ nói với phụ huynh'], correct: 1 },
      { question: '컴플레인 처리 순서는?', question_vn: 'Thứ tự xử lý khiếu nại?', options: ['변명→사과', '경청→공감→해결→인계→기록', '무시→매니저', '사과→할인'], options_vn: ['Bào chữa→Xin lỗi', 'Lắng nghe→Đồng cảm→Giải quyết→Chuyển→Ghi chép', 'Bỏ qua→Gọi quản lý', 'Xin lỗi→Giảm giá'], correct: 1 },
      { question: '이용 시간 종료 전 몇 분에 안내하나요?', question_vn: 'Nhắc trước bao nhiêu phút trước khi hết giờ?', options: ['1분', '5분', '10분', '30분'], options_vn: ['1 phút', '5 phút', '10 phút', '30 phút'], correct: 2 },
    ]
  },

  // ===== SOP 3: 아이 안전 관리 (최중요) =====
  {
    id: 'kids-sop-safety',
    title: '아이 안전 관리',
    title_en: 'Child Safety Management',
    title_vn: 'Quản lý an toàn trẻ em',
    category: '안전 관리',
    order_num: 3,
    content: `<h3>1. 안전 수칙 핵심 원칙</h3>
<ol>
<li>아이는 항상 시야에 있어야 합니다 — 담당 구역의 아이들을 지속 관찰</li>
<li>모든 아이에게는 반드시 보호자가 동반되어야 합니다</li>
<li>연령 제한 기구에 어린 아이가 접근하면 즉시 안내</li>
<li>음식물은 놀이공간에 반입 금지 (질식 위험)</li>
<li>아이가 울거나 도움을 요청하면 즉시 대응</li>
</ol>

<h3>2. 순회 점검 (30분마다)</h3>
<ol>
<li>매 30분마다 담당 구역을 순회합니다</li>
<li>확인 항목: 아이 안전상태, 기구 이상 여부, 바닥 상태, 위험 행동</li>
<li>순회 체크리스트를 작성합니다 (시간, 확인 사항, 이상 유무)</li>
<li>이상 발견 시 → 즉시 조치 + 매니저 보고</li>
</ol>

<h3>3. 위험 행동 대응</h3>
<ol>
<li>슬라이드 거꾸로 올라가기 → "여기서는 올라가면 위험해요, 계단으로 올라가자~"</li>
<li>높은 곳에서 뛰어내리기 → 즉시 접근하여 안전하게 내려오도록 도움</li>
<li>다른 아이를 밀거나 때리기 → 부드럽게 분리 후 보호자에게 알림</li>
<li>기구 사이에 끼임 → 당황하지 말고 차분하게 구출, 필요시 매니저 호출</li>
<li>이물질(동전, 작은 장난감) 입에 넣기 → 즉시 제거 시도, 삼킨 경우 119</li>
</ol>

<h3>4. 미아(보호자를 잃은 아이) 발생 시</h3>
<ol>
<li>아이를 안전한 장소(안내데스크)로 데려갑니다</li>
<li>아이를 안심시킵니다: "걱정 마, 엄마/아빠 금방 찾아줄게"</li>
<li>관내 방송으로 보호자를 호출합니다</li>
<li>아이의 인상착의, 팔찌 번호를 확인합니다</li>
<li>10분 이내 보호자를 못 찾으면 → 매니저 보고 + 출입구 강화 감시</li>
<li>절대 아이를 혼자 두지 않습니다 — 보호자 올 때까지 직원이 함께</li>
</ol>

<h3>5. 아이 부상 발생 시</h3>
<ol>
<li>즉시 달려가 상태를 확인합니다</li>
<li>가벼운 부상(찰과상): 구급상자에서 소독+밴드 처치, 보호자에게 알림</li>
<li>중간 부상(부종, 출혈): 응급처치 후 매니저 보고, 보호자와 병원 동행 안내</li>
<li>심각한 부상(골절 의심, 의식 없음): 119 즉시 신고 + 아이를 움직이지 않음</li>
<li>모든 부상은 사고보고서를 반드시 작성합니다 (시간, 장소, 상황, 조치)</li>
</ol>

<p><strong>⚠️ 최우선 원칙:</strong> 아이의 안전이 매출보다 우선합니다. 안전이 의심되면 운영을 중단하세요.</p>`,

    content_vn: `<h3>1. Nguyên tắc an toàn cốt lõi</h3>
<ol>
<li>Trẻ phải luôn trong tầm nhìn — quan sát liên tục các trẻ trong khu vực phụ trách</li>
<li>Mọi trẻ phải có phụ huynh đi cùng</li>
<li>Trẻ nhỏ tiếp cận thiết bị giới hạn tuổi → hướng dẫn ngay</li>
<li>Cấm mang thức ăn vào khu vui chơi (nguy cơ nghẹn)</li>
<li>Trẻ khóc hoặc cần giúp đỡ → phản ứng ngay lập tức</li>
</ol>

<h3>2. Tuần tra (mỗi 30 phút)</h3>
<ol>
<li>Tuần tra khu vực phụ trách mỗi 30 phút</li>
<li>Kiểm tra: an toàn trẻ, tình trạng thiết bị, sàn nhà, hành vi nguy hiểm</li>
<li>Điền checklist tuần tra (thời gian, nội dung kiểm tra, có bất thường không)</li>
<li>Phát hiện bất thường → xử lý ngay + báo quản lý</li>
</ol>

<h3>3. Xử lý hành vi nguy hiểm</h3>
<ol>
<li>Trèo ngược cầu trượt → "Đi lên bằng cầu thang sẽ an toàn hơn nhé~"</li>
<li>Nhảy từ chỗ cao → đến ngay, giúp trẻ xuống an toàn</li>
<li>Đẩy/đánh bạn → nhẹ nhàng tách ra, thông báo phụ huynh</li>
<li>Kẹt giữa thiết bị → bình tĩnh giải cứu, gọi quản lý nếu cần</li>
<li>Cho vật nhỏ vào miệng → lấy ra ngay, nếu nuốt → gọi 115</li>
</ol>

<h3>4. Khi trẻ bị lạc (mất phụ huynh)</h3>
<ol>
<li>Đưa trẻ đến nơi an toàn (quầy lễ tân)</li>
<li>An ủi trẻ: "Đừng lo, sẽ tìm bố mẹ ngay nhé"</li>
<li>Phát loa tìm phụ huynh</li>
<li>Ghi nhận đặc điểm trẻ, số vòng tay</li>
<li>Sau 10 phút không tìm được → báo quản lý + tăng giám sát cổng</li>
<li>TUYỆT ĐỐI không để trẻ một mình — nhân viên ở cùng cho đến khi tìm được phụ huynh</li>
</ol>

<h3>5. Khi trẻ bị thương</h3>
<ol>
<li>Đến ngay kiểm tra tình trạng</li>
<li>Thương nhẹ (trầy xước): sơ cứu + thông báo phụ huynh</li>
<li>Thương trung bình (sưng, chảy máu): sơ cứu + báo quản lý + hướng dẫn đi bệnh viện</li>
<li>Thương nặng (nghi gãy xương, bất tỉnh): gọi 115 ngay + KHÔNG di chuyển trẻ</li>
<li>Mọi chấn thương đều phải viết báo cáo sự cố (thời gian, địa điểm, tình huống, xử lý)</li>
</ol>

<p><strong>⚠️ Nguyên tắc tối cao:</strong> An toàn của trẻ quan trọng hơn doanh thu. Nếu nghi ngờ an toàn, hãy dừng hoạt động.</p>`,

    quizzes: [
      { question: '순회 점검은 몇 분마다 해야 하나요?', question_vn: 'Tuần tra mỗi bao lâu?', options: ['10분', '30분', '1시간', '2시간'], options_vn: ['10 phút', '30 phút', '1 tiếng', '2 tiếng'], correct: 1 },
      { question: '놀이공간에서 음식물을 금지하는 이유는?', question_vn: 'Tại sao cấm thức ăn trong khu vui chơi?', options: ['청소 때문', '질식 위험', '미관상', '규정'], options_vn: ['Vì dọn dẹp', 'Nguy cơ nghẹn', 'Thẩm mỹ', 'Quy định'], correct: 1 },
      { question: '미아 발생 시 첫 번째 조치는?', question_vn: 'Khi trẻ bị lạc, việc đầu tiên?', options: ['119 신고', '아이를 안내데스크로 데려가기', '관내 방송', '출구 폐쇄'], options_vn: ['Gọi 115', 'Đưa trẻ đến lễ tân', 'Phát loa', 'Đóng cổng'], correct: 1 },
      { question: '심각한 부상(골절 의심) 시 올바른 조치는?', question_vn: 'Khi nghi gãy xương, xử lý đúng?', options: ['아이를 옮기기', '119 신고 + 움직이지 않기', '밴드 붙이기', '보호자만 호출'], options_vn: ['Di chuyển trẻ', 'Gọi 115 + không di chuyển', 'Dán băng', 'Chỉ gọi phụ huynh'], correct: 1 },
      { question: '안전과 매출 중 우선순위는?', question_vn: 'Ưu tiên: an toàn hay doanh thu?', options: ['매출', '안전', '동일', '상황에 따라'], options_vn: ['Doanh thu', 'An toàn', 'Bằng nhau', 'Tùy tình huống'], correct: 1 },
    ]
  },

  // ===== SOP 4: 놀이시설 운영 및 점검 =====
  {
    id: 'kids-sop-equipment',
    title: '놀이시설 운영 및 점검',
    title_en: 'Play Equipment Operation & Inspection',
    title_vn: 'Vận hành & Kiểm tra thiết bị vui chơi',
    category: '시설 관리',
    order_num: 4,
    content: `<h3>1. 주요 놀이시설별 점검 사항</h3>
<ol>
<li>볼풀: 매일 이물질 제거, 주 1회 볼 세척/소독, 볼 개수 점검</li>
<li>트램펄린: 스프링 상태, 안전네트 고정, 패딩 상태 매일 확인</li>
<li>슬라이드: 연결부 볼트 조임, 표면 갈라짐, 착지 매트 상태</li>
<li>에어바운스: 공기압, 봉합 부위 찢어짐, 블로워 작동</li>
<li>모래놀이: 이물질 점검, 모래 교체 주기 확인</li>
<li>영유아 존: 작은 부품 떨어짐 확인, 쿠션 상태</li>
</ol>

<h3>2. 일일 점검 절차</h3>
<ol>
<li>오픈 전: 전 시설 육안 점검 (체크리스트 사용)</li>
<li>운영 중: 30분마다 순회하며 이상 확인</li>
<li>마감 시: 시설 상태 최종 확인 + 문제점 기록</li>
<li>점검 결과를 일일 점검표에 기록 (날짜, 시간, 점검자, 결과)</li>
</ol>

<h3>3. 연령별 이용 제한</h3>
<ol>
<li>영유아존 (0~36개월): 보호자 반드시 입장, 큰 아이 출입 금지</li>
<li>유아존 (3~5세): 기본 놀이기구, 낮은 슬라이드</li>
<li>키즈존 (6~12세): 트램펄린, 높은 슬라이드, 클라이밍</li>
<li>연령 표시판을 각 구역에 명확히 설치</li>
</ol>

<h3>4. 고장/이상 발생 시</h3>
<ol>
<li>해당 기구 즉시 사용 중지 → "점검중" 표시 부착</li>
<li>이용 중인 아이들을 안전하게 대피</li>
<li>매니저에게 보고 → 수리 요청</li>
<li>수리 완료 전까지 절대 재가동하지 않음</li>
<li>사고보고서 작성 (이상 내용, 발견 시간, 조치 내용)</li>
</ol>

<p><strong>⚠️ 핵심:</strong> "아마 괜찮겠지"라는 판단은 금물. 조금이라도 이상하면 사용을 중지하세요.</p>`,

    content_vn: `<h3>1. Kiểm tra theo từng loại thiết bị</h3>
<ol>
<li>Hồ bóng: loại bỏ vật lạ hàng ngày, rửa/khử trùng bóng 1 lần/tuần, kiểm tra số lượng</li>
<li>Bạt nhún: lò xo, lưới an toàn, đệm — kiểm tra hàng ngày</li>
<li>Cầu trượt: bu lông, bề mặt nứt, thảm hạ cánh</li>
<li>Nhà hơi: áp suất, đường may rách, quạt thổi</li>
<li>Khu cát: kiểm tra vật lạ, chu kỳ thay cát</li>
<li>Khu sơ sinh: kiểm tra mảnh nhỏ rơi ra, tình trạng đệm</li>
</ol>

<h3>2. Quy trình kiểm tra hàng ngày</h3>
<ol>
<li>Trước khi mở: kiểm tra bằng mắt toàn bộ (dùng checklist)</li>
<li>Trong giờ: tuần tra mỗi 30 phút</li>
<li>Khi đóng: kiểm tra cuối + ghi nhận vấn đề</li>
<li>Ghi kết quả vào bảng kiểm tra hàng ngày (ngày, giờ, người kiểm tra, kết quả)</li>
</ol>

<h3>3. Giới hạn tuổi theo khu vực</h3>
<ol>
<li>Khu sơ sinh (0~36 tháng): phụ huynh phải vào cùng, cấm trẻ lớn</li>
<li>Khu mẫu giáo (3~5 tuổi): thiết bị cơ bản, cầu trượt thấp</li>
<li>Khu thiếu nhi (6~12 tuổi): bạt nhún, cầu trượt cao, leo tường</li>
<li>Đặt biển giới hạn tuổi rõ ràng ở mỗi khu vực</li>
</ol>

<h3>4. Khi phát hiện hỏng/bất thường</h3>
<ol>
<li>Ngừng sử dụng ngay → gắn biển "Đang kiểm tra"</li>
<li>Sơ tán trẻ đang chơi an toàn</li>
<li>Báo quản lý → yêu cầu sửa chữa</li>
<li>TUYỆT ĐỐI không khởi động lại cho đến khi sửa xong</li>
<li>Viết báo cáo (nội dung bất thường, thời gian phát hiện, xử lý)</li>
</ol>

<p><strong>⚠️ Cốt lõi:</strong> KHÔNG ĐƯỢC nghĩ "chắc không sao đâu". Hơi nghi ngờ là phải ngừng sử dụng.</p>`,

    quizzes: [
      { question: '볼풀 볼 세척/소독 주기는?', question_vn: 'Chu kỳ rửa/khử trùng bóng?', options: ['매일', '주 1회', '월 1회', '분기 1회'], options_vn: ['Hàng ngày', '1 lần/tuần', '1 lần/tháng', '1 lần/quý'], correct: 1 },
      { question: '영유아존 입장 규칙은?', question_vn: 'Quy tắc khu sơ sinh?', options: ['누구나 가능', '보호자 반드시 동반', '직원만 입장', '5세 이상'], options_vn: ['Ai cũng được', 'Phụ huynh phải đi cùng', 'Chỉ nhân viên', 'Trên 5 tuổi'], correct: 1 },
      { question: '기구 고장 시 가장 먼저 할 일은?', question_vn: 'Khi thiết bị hỏng, việc đầu tiên?', options: ['직접 수리', '사용 중지 + 표시', '무시', '내일 처리'], options_vn: ['Tự sửa', 'Ngừng + gắn biển', 'Bỏ qua', 'Xử lý ngày mai'], correct: 1 },
    ]
  },

  // ===== SOP 5: 위생 관리 =====
  {
    id: 'kids-sop-hygiene',
    title: '위생 관리 (놀이공간 + 식음료)',
    title_en: 'Hygiene Management',
    title_vn: 'Quản lý vệ sinh',
    category: '위생 관리',
    order_num: 5,
    content: `<h3>1. 개인 위생</h3>
<ol>
<li>손 씻기: 비누로 최소 20초, 수시로 (화장실 후, 청소 후, 식품 취급 전후)</li>
<li>손 소독제: 놀이공간 순회 시 수시 사용</li>
<li>기침/재채기: 팔꿈치 안쪽으로 가리기</li>
<li>아프면 출근하지 않고 매니저에게 연락</li>
</ol>

<h3>2. 놀이공간 위생</h3>
<ol>
<li>놀이기구 표면: 2시간마다 소독 (아이 접촉 빈도 높은 부분 집중)</li>
<li>바닥: 오염 발견 즉시 청소, 정기 소독 1일 3회</li>
<li>볼풀: 매일 이물질 제거, 주 1회 세척 + 자외선 소독</li>
<li>화장실: 매 시간 점검, 1일 3회 이상 전체 소독</li>
<li>환기: 2시간마다 10분간 환기 또는 공기순환 시스템 가동</li>
</ol>

<h3>3. 식음료 위생 (카페/식당 구역)</h3>
<ol>
<li>식품 취급 전 반드시 손 씻기 + 위생장갑 착용</li>
<li>냉장 보관: 0~5°C / 냉동: -18°C 이하</li>
<li>유통기한: 매일 확인, 기한 지난 제품 즉시 폐기</li>
<li>교차오염 방지: 날것과 조리식품 도마/칼 분리</li>
<li>알레르기 주의: 주문 시 알레르기 여부 확인</li>
</ol>

<h3>4. 전염병 예방</h3>
<ol>
<li>아이가 구토/설사 시 → 해당 구역 즉시 폐쇄 + 전문 소독</li>
<li>수족구병 등 전염병 의심 시 → 매니저에게 보고 → 보호자에게 안내</li>
<li>매장 내 손 소독제 비치 확인 (입구, 놀이공간, 화장실)</li>
</ol>

<p><strong>⚠️ 핵심:</strong> 아이들은 뭐든 입에 넣습니다. 위생은 아이 건강에 직결됩니다.</p>`,

    content_vn: `<h3>1. Vệ sinh cá nhân</h3>
<ol>
<li>Rửa tay: xà phòng ít nhất 20 giây, thường xuyên (sau WC, sau dọn dẹp, trước/sau xử lý thực phẩm)</li>
<li>Dung dịch sát khuẩn: dùng thường xuyên khi tuần tra</li>
<li>Ho/hắt hơi: che bằng khuỷu tay</li>
<li>Nếu bệnh, không đi làm và liên hệ quản lý</li>
</ol>

<h3>2. Vệ sinh khu vui chơi</h3>
<ol>
<li>Bề mặt thiết bị: khử trùng mỗi 2 giờ (tập trung chỗ trẻ hay chạm)</li>
<li>Sàn: dọn ngay khi bẩn, khử trùng định kỳ 3 lần/ngày</li>
<li>Hồ bóng: loại vật lạ hàng ngày, rửa + khử trùng UV 1 lần/tuần</li>
<li>Nhà vệ sinh: kiểm tra mỗi giờ, khử trùng toàn bộ 3 lần/ngày trở lên</li>
<li>Thông gió: mỗi 2 giờ mở cửa 10 phút hoặc chạy hệ thống lọc không khí</li>
</ol>

<h3>3. Vệ sinh thực phẩm (khu café/ăn uống)</h3>
<ol>
<li>Rửa tay + đeo găng vệ sinh trước khi xử lý thực phẩm</li>
<li>Bảo quản lạnh: 0~5°C / Đông: dưới -18°C</li>
<li>Hạn sử dụng: kiểm tra hàng ngày, bỏ ngay sản phẩm hết hạn</li>
<li>Ngăn lây nhiễm chéo: tách thớt/dao cho đồ sống và đồ chín</li>
<li>Dị ứng: hỏi khách về dị ứng khi gọi món</li>
</ol>

<h3>4. Phòng ngừa bệnh truyền nhiễm</h3>
<ol>
<li>Trẻ nôn/tiêu chảy → đóng khu vực ngay + khử trùng chuyên dụng</li>
<li>Nghi bệnh tay chân miệng → báo quản lý → thông báo phụ huynh</li>
<li>Kiểm tra dung dịch sát khuẩn đặt ở cổng, khu chơi, WC</li>
</ol>

<p><strong>⚠️ Cốt lõi:</strong> Trẻ em hay cho mọi thứ vào miệng. Vệ sinh ảnh hưởng trực tiếp đến sức khỏe trẻ.</p>`,

    quizzes: [
      { question: '놀이기구 표면 소독 주기는?', question_vn: 'Chu kỳ khử trùng bề mặt thiết bị?', options: ['하루 1회', '2시간마다', '주 1회', '필요할 때만'], options_vn: ['1 lần/ngày', 'Mỗi 2 giờ', '1 lần/tuần', 'Khi cần'], correct: 1 },
      { question: '아이가 구토했을 때 올바른 조치는?', question_vn: 'Khi trẻ nôn, xử lý đúng?', options: ['걸레로 닦기', '해당 구역 폐쇄 + 전문 소독', '무시', '물로 씻기'], options_vn: ['Lau bằng giẻ', 'Đóng khu vực + khử trùng chuyên dụng', 'Bỏ qua', 'Rửa bằng nước'], correct: 1 },
      { question: '냉장 보관 적정 온도는?', question_vn: 'Nhiệt độ bảo quản lạnh đúng?', options: ['상온', '0~5°C', '10~15°C', '-5°C'], options_vn: ['Nhiệt độ phòng', '0~5°C', '10~15°C', '-5°C'], correct: 1 },
    ]
  },

  // ===== SOP 6: 비상 상황 대응 =====
  {
    id: 'kids-sop-emergency',
    title: '비상 상황 대응',
    title_en: 'Emergency Response',
    title_vn: 'Ứng phó tình huống khẩn cấp',
    category: '비상 대응',
    order_num: 6,
    content: `<h3>1. 화재 발생</h3>
<ol>
<li>큰 소리로 "불이야!" 외치고 화재 경보 버튼을 누릅니다</li>
<li>119에 신고합니다 (주소, 매장명, 상황)</li>
<li>아이들과 보호자를 비상구로 신속히 대피시킵니다</li>
<li>대피 시 아이를 절대 놓치지 않도록 인원 확인</li>
<li>초기 진화는 안전한 경우에만 시도 (소화기 사용)</li>
<li>대피 후 전원 무사 확인 → 매니저에게 보고</li>
</ol>

<h3>2. 정전/단수</h3>
<ol>
<li>비상조명 점등 확인 — 어두운 곳에서 아이가 다치지 않도록 주의</li>
<li>보호자와 아이에게 안내: "곧 복구됩니다, 안전한 곳에 계세요"</li>
<li>놀이기구 중 전원이 필요한 것은 사용 중지</li>
<li>냉장고 문 열지 않기 (식품 보존)</li>
<li>30분 이상 지속 시 매니저 판단 → 영업 중단 결정</li>
</ol>

<h3>3. 지진</h3>
<ol>
<li>"지진이에요! 머리를 보호하세요!" 큰 소리로 안내</li>
<li>테이블 아래 등 안전한 곳으로 대피 유도</li>
<li>유리창, 무거운 선반에서 멀리</li>
<li>흔들림이 멈추면 → 건물 밖으로 대피</li>
<li>인원 확인 → 119 상황 보고</li>
</ol>

<h3>4. 의심인물/위험인물 출현</h3>
<ol>
<li>침착하게 매니저에게 즉시 알립니다</li>
<li>해당 인물을 자극하지 않습니다</li>
<li>아이들을 조용히 안전한 구역으로 이동</li>
<li>필요시 112 경찰 신고</li>
<li>상황 종료 시 사고보고서 작성</li>
</ol>

<p><strong>⚠️ 기억하세요:</strong> 비상시 가장 중요한 것은 '아이들의 대피'입니다. 물건, 시설은 나중에 복구할 수 있지만 아이의 안전은 대체 불가능합니다.</p>`,

    content_vn: `<h3>1. Hỏa hoạn</h3>
<ol>
<li>Hét to "Cháy!" và nhấn nút báo cháy</li>
<li>Gọi 114 (địa chỉ, tên cửa hàng, tình huống)</li>
<li>Sơ tán trẻ và phụ huynh qua lối thoát hiểm nhanh chóng</li>
<li>Kiểm tra đầu người — KHÔNG để mất trẻ khi sơ tán</li>
<li>Chữa cháy ban đầu CHỈ khi an toàn (dùng bình chữa cháy)</li>
<li>Sau sơ tán: xác nhận mọi người an toàn → báo quản lý</li>
</ol>

<h3>2. Mất điện/nước</h3>
<ol>
<li>Kiểm tra đèn khẩn cấp — cẩn thận trẻ va chạm trong bóng tối</li>
<li>Thông báo: "Sẽ có điện lại sớm, hãy ở yên nơi an toàn"</li>
<li>Ngừng thiết bị cần điện</li>
<li>Không mở tủ lạnh (bảo quản thực phẩm)</li>
<li>Sau 30 phút → quản lý quyết định ngừng kinh doanh</li>
</ol>

<h3>3. Động đất</h3>
<ol>
<li>"Động đất! Bảo vệ đầu!" hét to hướng dẫn</li>
<li>Trú dưới bàn hoặc nơi an toàn</li>
<li>Tránh xa cửa kính, kệ nặng</li>
<li>Khi hết rung → sơ tán ra ngoài</li>
<li>Kiểm tra đầu người → báo 114</li>
</ol>

<h3>4. Người đáng ngờ/nguy hiểm</h3>
<ol>
<li>Bình tĩnh báo quản lý ngay</li>
<li>Không kích động người đó</li>
<li>Di chuyển trẻ nhẹ nhàng đến khu an toàn</li>
<li>Nếu cần gọi 113 cảnh sát</li>
<li>Sau sự việc: viết báo cáo</li>
</ol>

<p><strong>⚠️ Ghi nhớ:</strong> Trong khẩn cấp, quan trọng nhất là 'SƠ TÁN TRẺ'. Đồ đạc, cơ sở có thể khôi phục, nhưng an toàn của trẻ là không thể thay thế.</p>`,

    quizzes: [
      { question: '화재 시 가장 먼저 할 일은?', question_vn: 'Việc đầu tiên khi có cháy?', options: ['물 끼얹기', '"불이야!" + 경보 + 119', '대피 후 신고', '소화기 찾기'], options_vn: ['Dội nước', '"Cháy!" + báo động + 114', 'Sơ tán rồi gọi', 'Tìm bình chữa cháy'], correct: 1 },
      { question: '정전 시 놀이기구 조치는?', question_vn: 'Khi mất điện, xử lý thiết bị?', options: ['계속 운영', '전원 필요한 기구 사용 중지', '전체 퇴장', '무시'], options_vn: ['Tiếp tục', 'Ngừng thiết bị cần điện', 'Mọi người ra ngoài', 'Bỏ qua'], correct: 1 },
      { question: '비상시 가장 중요한 것은?', question_vn: 'Điều quan trọng nhất khi khẩn cấp?', options: ['매출 보호', '시설 보호', '아이들의 대피', '서류 보관'], options_vn: ['Bảo vệ doanh thu', 'Bảo vệ cơ sở', 'Sơ tán trẻ em', 'Giữ tài liệu'], correct: 2 },
    ]
  },

  // ===== SOP 7: 클로징 =====
  {
    id: 'kids-sop-closing',
    title: '매장 클로징 절차',
    title_en: 'Store Closing Procedures',
    title_vn: 'Quy trình đóng cửa hàng',
    category: '클로징',
    order_num: 7,
    content: `<h3>1. 마감 안내 (종료 30분 전)</h3>
<ol>
<li>관내 방송: "이용 시간이 30분 남았습니다"</li>
<li>15분 전, 5분 전 추가 안내</li>
<li>종료 시 아이들에게 부드럽게 안내하여 놀이공간에서 나오도록 유도</li>
</ol>

<h3>2. 퇴장 확인</h3>
<ol>
<li>모든 구역을 순회하며 남아있는 아이/보호자 확인</li>
<li>놀이기구 사이, 숨을 수 있는 공간 반드시 확인 (볼풀 안, 터널 안 등)</li>
<li>분실물 확인 → 분실물 보관함에 보관</li>
<li>팔찌/입장권 최종 회수</li>
</ol>

<h3>3. 정산</h3>
<ol>
<li>POS 매출 합계 확인</li>
<li>현금 시재 대조 (시재표 작성)</li>
<li>불일치 시 → 매니저에게 즉시 보고</li>
<li>카드/모바일 결제 내역 확인</li>
</ol>

<h3>4. 청소 및 소독</h3>
<ol>
<li>놀이기구 전체 소독 (특히 손잡이, 레일)</li>
<li>바닥 청소: 빗자루 → 물걸레 → 소독</li>
<li>화장실 최종 청소 + 비품 보충</li>
<li>카페 구역: 식기 세척, 장비 청소, 식품 보관 확인</li>
<li>쓰레기 전량 배출</li>
</ol>

<h3>5. 시건장치 및 퇴근</h3>
<ol>
<li>전원 차단: 놀이기구 전원, 에어컨, 불필요한 조명 OFF</li>
<li>가스 밸브 잠금 (카페/주방 사용 시)</li>
<li>모든 창문, 출입구, 비상구 잠금 확인</li>
<li>보안 알람 설정</li>
<li>퇴근 체크아웃</li>
<li>마지막 퇴근자는 모든 잠금 상태를 2회 확인</li>
</ol>

<p><strong>⚠️ 중요:</strong> 클로징 순회 시 모든 공간을 빠짐없이 확인하세요. 아이가 놀이기구 안에 숨어 있을 수 있습니다.</p>`,

    content_vn: `<h3>1. Thông báo đóng cửa (trước 30 phút)</h3>
<ol>
<li>Phát loa: "Còn 30 phút nữa là hết giờ hoạt động"</li>
<li>Nhắc thêm lúc còn 15 phút và 5 phút</li>
<li>Khi hết giờ, nhẹ nhàng hướng dẫn trẻ rời khu vui chơi</li>
</ol>

<h3>2. Kiểm tra khách ra về</h3>
<ol>
<li>Đi vòng tất cả khu vực, kiểm tra trẻ/phụ huynh còn sót</li>
<li>PHẢI kiểm tra kỹ nơi trẻ có thể trốn (trong hồ bóng, đường hầm...)</li>
<li>Kiểm tra đồ thất lạc → bỏ vào tủ đồ thất lạc</li>
<li>Thu hồi vòng tay/vé cuối cùng</li>
</ol>

<h3>3. Quyết toán</h3>
<ol>
<li>Kiểm tra tổng doanh thu POS</li>
<li>Đối chiếu tiền mặt (viết bảng kiểm tiền)</li>
<li>Nếu chênh lệch → báo quản lý ngay</li>
<li>Kiểm tra giao dịch thẻ/ví điện tử</li>
</ol>

<h3>4. Dọn dẹp & Khử trùng</h3>
<ol>
<li>Khử trùng toàn bộ thiết bị (đặc biệt tay nắm, thanh vịn)</li>
<li>Sàn: quét → lau → khử trùng</li>
<li>WC: dọn cuối + bổ sung đồ dùng</li>
<li>Khu café: rửa dụng cụ, vệ sinh máy, kiểm tra bảo quản thực phẩm</li>
<li>Đổ toàn bộ rác</li>
</ol>

<h3>5. Khóa cửa & Tan ca</h3>
<ol>
<li>Tắt điện: thiết bị, điều hòa, đèn không cần thiết</li>
<li>Khóa van gas (nếu có bếp/café)</li>
<li>Kiểm tra tất cả cửa sổ, cửa ra vào, lối thoát hiểm đã khóa</li>
<li>Bật báo động an ninh</li>
<li>Chấm công ra về</li>
<li>Người cuối cùng kiểm tra khóa 2 LẦN</li>
</ol>

<p><strong>⚠️ Quan trọng:</strong> Khi tuần tra đóng cửa, kiểm tra TẤT CẢ không gian. Trẻ có thể trốn bên trong thiết bị.</p>`,

    quizzes: [
      { question: '마감 안내는 종료 몇 분 전에 시작하나요?', question_vn: 'Bắt đầu nhắc đóng cửa trước mấy phút?', options: ['5분', '15분', '30분', '1시간'], options_vn: ['5 phút', '15 phút', '30 phút', '1 tiếng'], correct: 2 },
      { question: '퇴장 확인 시 반드시 체크할 곳은?', question_vn: 'Phải kiểm tra kỹ nơi nào khi đóng cửa?', options: ['입구만', '놀이기구 안 숨을 수 있는 공간', '화장실만', '카페만'], options_vn: ['Chỉ cổng', 'Nơi trẻ có thể trốn trong thiết bị', 'Chỉ WC', 'Chỉ café'], correct: 1 },
      { question: '마지막 퇴근자의 의무는?', question_vn: 'Nghĩa vụ người cuối cùng ra về?', options: ['빠른 퇴근', '모든 잠금 2회 확인', '인사만', '청소만'], options_vn: ['Về nhanh', 'Kiểm tra khóa 2 lần', 'Chỉ chào', 'Chỉ dọn'], correct: 1 },
    ]
  },
];
