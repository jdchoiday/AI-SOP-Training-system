// ============================================
// 통합 씬 프롬프트 매핑 (Single Source of Truth)
// ============================================
// 이 파일 하나만 수정하면 api/image.js, ai-provider.js, admin/index.html 모두 반영됨
// ============================================

const CHAR = 'A friendly young Korean woman in her 20s in neat professional attire';
const CHAR_SHORT = 'A young Korean woman';

const SCENE_MAP = [
  // === 위생/손씻기 ===
  { kw: ['손 씻', '손씻', '비누', 'soap', '세정', '손을'], en: `${CHAR_SHORT} carefully washing hands with soap under running water at a stainless steel kitchen sink. Tidy modern kitchen with warm lighting.` },
  { kw: ['손바닥', '문질러', '문지르'], en: 'Close-up of two hands rubbing palms together under running water with soap bubbles. Stainless steel sink with warm overhead light.' },
  { kw: ['손가락', '손톱', '엄지'], en: 'Close-up of hands carefully scrubbing between fingers with soap suds. Kitchen sink area with bright window light.' },
  { kw: ['세균', '감염', '예방', '균'], en: 'A colorful cartoon-style educational poster about hand hygiene pinned on a cork board. Bright cheerful classroom wall.' },

  // === 출근/준비 ===
  { kw: ['출근', '도착', '입장'], en: `${CHAR_SHORT} walking through a glass entrance door in warm morning sunlight. Modern kids cafe lobby with colorful decorations.` },
  { kw: ['체크인', '기록'], en: `${CHAR_SHORT} tapping an ID card on a wall-mounted time clock. Bright hallway with children artwork on walls.` },
  { kw: ['유니폼', '갈아입'], en: `${CHAR_SHORT} adjusting her apron in front of a locker room mirror, pinning a name tag. Wooden lockers and warm lighting.` },
  { kw: ['명찰', '이름표'], en: `${CHAR_SHORT} pinning a cute name tag onto her apron chest pocket. Cozy staff room.` },
  { kw: ['머리', '묶'], en: `${CHAR_SHORT} tying her hair into a neat ponytail in front of a mirror. Cozy staff changing area.` },
  { kw: ['액세서리', '반지', '귀걸이'], en: `${CHAR_SHORT} placing jewelry into a small tray in a locker. Warm cozy changing room.` },

  // === 점검/확인 ===
  { kw: ['점검', '체크', '확인', '살피'], en: `${CHAR_SHORT} holding a clipboard and checking items on a printed checklist. Colorful kids play area in background.` },
  { kw: ['놀이기구', '미끄럼틀'], en: `${CHAR_SHORT} inspecting a colorful plastic slide, checking for loose parts. Indoor kids playground with foam mats.` },
  { kw: ['볼풀'], en: `${CHAR_SHORT} reaching into a ball pit full of colorful plastic balls, checking for debris. Fun indoor playground.` },
  { kw: ['트램펄린', '트램폴린'], en: `${CHAR_SHORT} pressing on trampoline surface testing bounce and checking safety net. Indoor play center.` },
  { kw: ['파손', '보고', '고장', '이상'], en: `${CHAR_SHORT} taking a photo of a scratched surface with her phone and writing notes. Indoor play facility.` },
  { kw: ['바닥', '미끄'], en: `${CHAR_SHORT} crouching to check soft foam floor mats, wiping a spot. Colorful play area.` },
  { kw: ['비상구', '대피'], en: 'A green illuminated emergency exit sign above a door. Bright modern kids cafe corridor with colorful walls.' },

  // === 청소/위생 ===
  { kw: ['청소', '빗자루', '쓸'], en: `${CHAR_SHORT} sweeping the floor with a broom. Bright kids cafe dining area with colorful tables.` },
  { kw: ['물걸레', '바닥 닦'], en: `${CHAR_SHORT} mopping tile floor with smooth motions. Bright cafe area with kids chairs stacked.` },
  { kw: ['소독', '스프레이', '살균'], en: `${CHAR_SHORT} spraying a bottle of sanitizer on a table surface and wiping with a yellow cloth. Bright cafe.` },
  { kw: ['화장실', '세면'], en: 'A tidy family restroom with a small child-sized sink, soap dispenser, and paper towels. Bright colorful tiles.' },
  { kw: ['쓰레기', '분리수거'], en: `${CHAR_SHORT} carrying a trash bag toward color-coded recycling bins. Back area of kids cafe.` },
  { kw: ['테이블', '의자', '카페'], en: `${CHAR_SHORT} wiping a wooden cafe table and arranging high chairs. Cozy kids cafe with warm pendant lights.` },

  // === 오픈 준비 ===
  { kw: ['조명', '전등', '불'], en: 'Bright colorful LED lights turning on throughout a fun indoor kids playground. Morning setup vibes.' },
  { kw: ['음악', 'BGM'], en: `${CHAR_SHORT} adjusting volume on a small Bluetooth speaker at the reception counter. Cozy cafe area.` },
  { kw: ['POS', '포스', '단말기'], en: `${CHAR_SHORT} testing a touchscreen POS register and receipt printer at the front counter. Modern cafe counter.` },
  { kw: ['양말', '자판기'], en: `${CHAR_SHORT} restocking a small sock vending machine near the entrance. Kids cafe lobby.` },
  { kw: ['안내 표지판', '가격표'], en: 'A colorful pricing and rules sign being placed at the entrance of a kids cafe. Bright welcoming lobby.' },

  // === 고객 응대 ===
  { kw: ['인사', '어서오세요', '맞이', '환영', '안녕'], en: `${CHAR} smiling brightly and bowing to welcome a family with a small child at the colorful front desk of a kids cafe.` },
  { kw: ['팔찌', '밴드'], en: `${CHAR_SHORT} gently fastening a colorful paper wristband on a small child's wrist at the counter.` },
  { kw: ['나이', '연령', '인원'], en: `${CHAR_SHORT} talking with parents at the reception counter, pointing at an age guide chart. Kids cafe entrance.` },
  { kw: ['요금', '가격'], en: `${CHAR_SHORT} pointing at a colorful pricing board while explaining to parents. Bright kids cafe reception.` },
  { kw: ['안전 수칙', '규칙', '주의'], en: `${CHAR_SHORT} showing a large illustrated safety rules poster to parents with a child. Kids cafe entrance.` },
  { kw: ['보호자', '부모', '동반', '학부모'], en: `${CHAR_SHORT} having a friendly conversation with a parent at a cafe table. Warm cozy seating area.` },
  { kw: ['신발장', '사물함'], en: `${CHAR_SHORT} guiding a family toward colorful shoe lockers. Bright kids cafe entrance with foam flooring.` },
  { kw: ['결제', '카드'], en: `${CHAR_SHORT} processing a card payment on a POS terminal at the counter. Modern kids cafe reception.` },

  // === 놀이공간/아이 ===
  { kw: ['아이', '어린이', '유아', '아동', '원아'], en: `${CHAR_SHORT} kneeling at eye level with happy small children in a bright colorful indoor playground with ball pit.` },
  { kw: ['연령', '구역', '영유아존'], en: `${CHAR_SHORT} leading a parent and toddler into a soft padded baby play zone. Pastel colors and soft toys.` },
  { kw: ['위험', '제지', '안전해요'], en: `${CHAR_SHORT} gently holding a child's hand, redirecting them away from a high area. Indoor playground.` },
  { kw: ['놀이', '게임', '활동'], en: 'A bright colorful indoor playroom with slides, building blocks, and art supplies on low wooden tables. Warm light.' },

  // === 칭찬/격려/감정 ===
  { kw: ['칭찬', '격려', '응원'], en: `${CHAR_SHORT} giving an enthusiastic double thumbs-up to a beaming happy child in a colorful playroom.` },
  { kw: ['잘했어', '대단', '훌륭'], en: `${CHAR_SHORT} clapping her hands with a proud smile while a child proudly shows a crayon drawing. Art table.` },
  { kw: ['자존감', '자신감', '자기 효능'], en: 'A proud small child standing tall holding up a colorful craft project. Korean teacher in apron watching with warm encouraging smile.' },
  { kw: ['눈빛', '표정', '눈 맞', '눈높이'], en: `${CHAR_SHORT} kneeling down to make warm eye contact with a small child, both smiling gently. Soft playroom light.` },
  { kw: ['진심', '진정성', '진짜'], en: `Close-up of ${CHAR_SHORT} speaking sincerely with both hands on her heart, genuine warm expression. Soft background.` },
  { kw: ['구체적', '명확', '디테일'], en: `${CHAR_SHORT} leaning over a table pointing at specific parts of a child's crayon drawing. Colorful art supplies around.` },
  { kw: ['기계적', '반복', '습관적'], en: 'A person looking distracted giving a weak thumbs-up without eye contact. Dull muted office setting.' },

  // === 소통/대화/피드백 ===
  { kw: ['소통', '대화', '경청', '들어'], en: `${CHAR_SHORT} leaning forward attentively at a round table, listening with focused caring expression. Cozy cafe area.` },
  { kw: ['피드백', '반응', '답변'], en: `${CHAR_SHORT} nodding thoughtfully while writing notes on a clipboard. Bright meeting area with whiteboard.` },
  { kw: ['말투', '어조', '목소리', '톤'], en: `${CHAR_SHORT} speaking gently with soft hand gestures to a small child sitting on floor. Warm playroom.` },

  // === 감정/심리 ===
  { kw: ['감정', '기분', '느낌', '정서'], en: 'Colorful laminated emotion cards showing happy, sad, angry, surprised faces spread on a low wooden table. Bright classroom.' },
  { kw: ['공감', '이해', '위로'], en: `${CHAR_SHORT} sitting on the floor beside a sad child, gently patting their back. Soft warm playroom light.` },
  { kw: ['동기', '의욕', '열정', '열의'], en: `${CHAR_SHORT} energetically raising her arms leading children in a fun group activity. Colorful indoor playground.` },
  { kw: ['스트레스', '번아웃', '지침', '힘들'], en: `${CHAR_SHORT} sitting at a wooden break room table with a cup of tea, taking a calming breath. Cozy staff room.` },
  { kw: ['긴장', '걱정', '실수', '처음'], en: `${CHAR_SHORT} taking a deep breath at a doorway, about to enter a room. Encouraging warm atmosphere.` },
  { kw: ['관심', '사랑', '마음'], en: `${CHAR_SHORT} holding a small hand-made heart card from a child, smiling warmly. Soft bright playroom.` },

  // === 불만 처리 ===
  { kw: ['불만', '컴플레인'], en: `${CHAR_SHORT} listening carefully to a concerned parent at the cafe counter, nodding attentively. Kids cafe reception.` },
  { kw: ['사과', '죄송'], en: `${CHAR_SHORT} bowing slightly and apologetically to a parent at the reception desk. Kids cafe lobby.` },
  { kw: ['매니저', '인계'], en: `${CHAR_SHORT} introducing a colleague in a dark blue polo shirt to handle an issue. Kids cafe office area.` },

  // === 안전/비상 ===
  { kw: ['안전', '주의', '위험'], en: 'Colorful illustrated safety instruction signs posted on a wall next to a kids play area. Bright indoor playground.' },
  { kw: ['응급', '구급', '부상'], en: `${CHAR_SHORT} opening a white first aid box on a shelf, taking out bandages. Bright staff room of kids cafe.` },
  { kw: ['화재', '소화기'], en: 'A red fire extinguisher mounted on a wall with a pressure gauge. Bright kids cafe corridor with colorful walls.' },
  { kw: ['119', '신고', '전화'], en: `${CHAR_SHORT} speaking urgently on a phone while looking at an emergency procedure poster on wall.` },
  { kw: ['대피', '대피로', '안전하게'], en: `${CHAR_SHORT} calmly guiding small children in a line toward a green exit sign. Bright corridor.` },
  { kw: ['CCTV', '보안', '모니터'], en: 'A small desk with two CCTV monitors showing different areas of a colorful kids playground. Staff office.' },

  // === 마감 ===
  { kw: ['퇴장', '시간 종료'], en: `${CHAR_SHORT} approaching a family and pointing at the time on a tablet screen. Indoor playground.` },
  { kw: ['정산', '매출'], en: `${CHAR_SHORT} counting cash at the register and checking POS screen totals. Evening cafe counter.` },
  { kw: ['잠금', '시건', '닫'], en: 'A hand locking a glass entrance door and testing the handle. Evening light through windows of kids cafe.' },
  { kw: ['보안', '알람'], en: 'A hand entering a code on a security alarm keypad by the door. Dim evening kids cafe entrance.' },
  { kw: ['일지', '보고서'], en: `${CHAR_SHORT} writing in a daily log notebook at a wooden desk under a warm desk lamp. Cozy staff office.` },
  { kw: ['마무리', '정리', '퇴근', '끝'], en: 'A tidy organized reception counter of a kids cafe at end of day. Neatly arranged items, warm evening window light.' },

  // === 교육/학습/가치 ===
  { kw: ['교육', '철학', '가치', '비전'], en: `${CHAR_SHORT} writing key values on a whiteboard with colorful markers. Bright cozy training room with round table.` },
  { kw: ['윤리', '도덕', '양심'], en: `${CHAR_SHORT} thoughtfully reading a handbook at a wooden table. Cozy bright staff meeting room.` },
  { kw: ['마음가짐', '태도', '자세'], en: `${CHAR_SHORT} standing tall with confident posture next to a motivational poster. Bright staff room.` },
  { kw: ['사명감', '책임감', '보람'], en: `${CHAR_SHORT} smiling warmly while watching children play happily through a window. Bright indoor playground.` },
  { kw: ['존중', '배려', '친절'], en: `${CHAR_SHORT} kneeling to make eye contact with a small shy child, with a gentle warm expression.` },
  { kw: ['성장', '발달', '배움', '학습'], en: 'A hallway wall display with colorful children artwork, growth photos, and star stickers. Bright cheerful atmosphere.' },
  { kw: ['규칙', '규정', '절차', '약속', '기준'], en: `${CHAR_SHORT} pointing at a colorful illustrated rules poster on a classroom wall. Organized playroom.` },
  { kw: ['모범', '본보기', '리더'], en: `${CHAR_SHORT} demonstrating how to properly tidy up toys to watching children. Bright organized playroom.` },
  { kw: ['인성', '감사'], en: 'A warm illustrated poster showing cartoon children sharing toys and helping each other. Bright classroom wall.' },

  // === 교수법/방법 ===
  { kw: ['패턴', '공식', '방법', '기법', '기술'], en: `${CHAR_SHORT} pointing at a step-by-step diagram drawn on a whiteboard. Bright cozy training room.` },
  { kw: ['효과', '결과', '변화', '영향'], en: 'A presentation board showing a before-and-after comparison with positive results and smiley stickers.' },
  { kw: ['예를 들', '예시', '예컨대', '사례'], en: `${CHAR_SHORT} presenting examples on a TV screen in a bright cozy training room with round table.` },
  { kw: ['비교', '차이', '다른', '반면'], en: 'A whiteboard split in two halves showing two contrasting approaches with drawings. Bright meeting room.' },
  { kw: ['중요', '핵심', '기억', '꼭'], en: `${CHAR_SHORT} pointing at a highlighted key point with a star sticker on a whiteboard. Bright room.` },

  // === 질문/생각/경험 ===
  { kw: ['질문', '궁금', '물어', '생각해'], en: `${CHAR_SHORT} with a thoughtful expression, finger on chin, looking at a question written on whiteboard. Bright room.` },
  { kw: ['경험', '겪어', '해본', '시도'], en: `${CHAR_SHORT} gesturing expressively as she tells a story to colleagues. Warm cozy meeting room.` },

  // === 집중/관찰 ===
  { kw: ['집중', '몰입', '집중력'], en: 'A small child deeply focused on building a tall tower with colorful blocks. Korean teacher in apron watching quietly from behind.' },
  { kw: ['관찰', '지켜', '바라보'], en: `${CHAR_SHORT} quietly observing children playing from a distance, standing near a pillar. Bright open playroom.` },

  // === 미술/창작 ===
  { kw: ['크래용', '색연필', '그림', '그리', '미술'], en: 'A happy child drawing with colorful crayons at a low wooden table. Korean teacher in apron admiring the artwork beside.' },

  // === 도구/자료 ===
  { kw: ['도구', '자료', '교구', '재료'], en: 'Organized wooden shelves with labeled bins of educational toys, art supplies, and colorful teaching materials.' },

  // === 탐구/호기심 ===
  { kw: ['레지오', '에밀리아', '탐구', '호기심', '발견', '자기발견'], en: 'Small children curiously exploring nature items on a table - leaves, pinecones, magnifying glass. Teacher in apron observing.' },

  // === 언어 ===
  { kw: ['언어', '영어', '베트남'], en: 'A colorful classroom wall with multilingual flashcard posters in Korean, English and Vietnamese. Bright cheerful.' },

  // === 건강/운동 ===
  { kw: ['건강', '운동', '신체'], en: `${CHAR_SHORT} leading small children in a fun stretching exercise on soft mats. Bright colorful play room.` },

  // === 예민/민감 ===
  { kw: ['예민', '민감', '섬세'], en: `${CHAR_SHORT} gently and carefully approaching a shy child sitting alone, crouching with a soft caring smile.` },

  // === 음식 ===
  { kw: ['음식', '식사', '간식', '요리'], en: 'A cozy cafe counter with healthy colorful snacks arranged on cute plates. Kids cafe snack bar with warm pendant lights.' },

  // === 소개/시작/요약 ===
  { kw: ['배우겠', '알아보', '살펴', '시작하겠', '시작'], en: `${CHAR_SHORT} standing in front of a TV screen, warmly introducing a training topic. Cozy meeting room with round table.` },
  { kw: ['안녕하세요', '소개', '환영합니다'], en: `${CHAR} standing at the front of a cozy meeting room, warmly greeting the audience with open arms.` },
  { kw: ['요약', '복습'], en: 'A whiteboard filled with colorful bullet points, key takeaways and star stickers. Bright cozy meeting room.' },

  // === 교사/선생님 ===
  { kw: ['교사', '선생님', '교직원'], en: `${CHAR} standing proudly at the entrance of a colorful kids classroom. Bright hallway with children artwork.` },

  // === 팀/동료 ===
  { kw: ['팀워크', '협력', '동료', '팀'], en: 'Two Korean women in matching light blue polo shirts and aprons discussing at a round wooden table. Bright cozy meeting room.' },
];

// 카메라 앵글 배열
const CAMERA_ANGLES = [
  'Wide establishing shot,',
  'Medium shot,',
  'Close-up detail shot,',
  'Over-the-shoulder shot,',
  'Low angle shot,',
  'Eye-level shot,',
];

// 기본 세팅 & 네거티브 프롬프트
const BASE_SETTING = 'Candid photo in a bright modern workplace. Warm natural lighting. Shot on Canon EOS R5, 35mm lens, f/2.8, natural window lighting.';
const NEGATIVE_PROMPT = 'deformed, ugly, blurry, bad anatomy, extra limbs';
const QUALITY_SUFFIX = 'Candid editorial photography, natural skin texture, realistic warm lighting, 8k uhd.';

/**
 * 한국어 나레이션 → 영어 이미지 프롬프트 변환
 * @param {string} narration - 한국어 나레이션 텍스트
 * @param {string} [section] - 섹션 제목 (optional)
 * @param {object} [options] - { withCamera: boolean, cameraIndex: number }
 * @returns {string} 영어 이미지 프롬프트
 */
function narrationToPrompt(narration, section, options) {
  const text = ((narration || '') + ' ' + (section || '')).toLowerCase();
  const opts = options || {};

  // 카메라 앵글 선택
  let camera = '';
  if (opts.withCamera !== false) {
    const idx = opts.cameraIndex != null ? opts.cameraIndex % CAMERA_ANGLES.length : Math.floor(Math.random() * CAMERA_ANGLES.length);
    camera = CAMERA_ANGLES[idx] + ' ';
  }

  // 키워드 매칭 (score 기반 - 여러 키워드 매칭될수록 높은 점수)
  let bestMatch = null;
  let bestScore = 0;
  for (const s of SCENE_MAP) {
    const score = s.kw.filter(k => text.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = s;
    }
  }

  if (bestMatch) {
    return `${camera}${bestMatch.en} ${QUALITY_SUFFIX}`;
  }

  // fallback: 일반 교육 장면
  return `${camera}${CHAR_SHORT} explaining a topic in front of a whiteboard in a bright cozy training room with round table. ${QUALITY_SUFFIX}`;
}

/**
 * 나레이션에서 액션 추출
 * 여러 매칭된 액션을 score 순으로 반환
 */
function extractActions(text) {
  const matches = [];
  for (const s of SCENE_MAP) {
    const count = s.kw.filter(k => text.includes(k)).length;
    if (count > 0) matches.push({ kw: s.kw, en: s.en, score: count });
  }
  matches.sort((a, b) => b.score - a.score);
  return matches;
}

// Node.js (api/image.js)에서 사용
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SCENE_MAP, CAMERA_ANGLES, BASE_SETTING, NEGATIVE_PROMPT, QUALITY_SUFFIX, narrationToPrompt, extractActions };
}

// 브라우저 (admin/index.html, ai-provider.js)에서 사용
if (typeof window !== 'undefined') {
  window.ScenePrompts = { SCENE_MAP, CAMERA_ANGLES, BASE_SETTING, NEGATIVE_PROMPT, QUALITY_SUFFIX, narrationToPrompt, extractActions };
}
