// ============================================
// 통합 씬 프롬프트 매핑 (Single Source of Truth)
// ============================================
// 이 파일 하나만 수정하면 api/image.js, ai-provider.js, admin/index.html 모두 반영됨
// ============================================

const SCENE_MAP = [
  // === 위생/손씻기 ===
  { kw: ['손 씻', '손씻', '비누', 'soap', '세정', '손을'], en: 'A young Korean woman carefully washing hands with soap under running water at a clean modern sink. Bright washroom with white tiles.' },
  { kw: ['손바닥', '문질러', '문지르'], en: 'Close-up of two hands rubbing palms together under running water with soap bubbles. Bright clean sink area.' },
  { kw: ['손가락', '손톱', '엄지'], en: 'Close-up of hands carefully cleaning between fingers and under fingernails with soap. Bright modern washroom.' },
  { kw: ['세균', '감염', '예방', '균'], en: 'A colorful educational infographic poster about germs and hygiene on a clean white wall. Bright classroom.' },

  // === 출근/준비 ===
  { kw: ['출근', '도착', '입장'], en: 'A Korean woman in neat uniform walking through the staff entrance in warm morning light. Modern lobby.' },
  { kw: ['체크인', '기록'], en: 'A Korean woman scanning an ID badge on a wall-mounted digital terminal. Clean modern hallway.' },
  { kw: ['유니폼', '갈아입'], en: 'A Korean woman adjusting a clean uniform in front of a mirror, pinning name badge.' },
  { kw: ['명찰', '이름표'], en: 'A Korean woman pinning a name badge onto uniform chest pocket. Clean locker room.' },
  { kw: ['머리', '묶'], en: 'A Korean woman tying hair into a neat ponytail, removing earrings. Clean mirror area.' },
  { kw: ['액세서리', '반지', '귀걸이'], en: 'A Korean woman removing jewelry into a small tray before starting work. Bright locker room.' },

  // === 점검/확인 ===
  { kw: ['점검', '체크', '확인', '살피'], en: 'A Korean woman in uniform checking items on a clipboard checklist. Well-organized facility room.' },
  { kw: ['놀이기구', '미끄럼틀'], en: 'A Korean woman checking a colorful slide for loose parts and sharp edges. Bright play area.' },
  { kw: ['볼풀'], en: 'A Korean woman reaching into a ball pit, checking for debris among colorful balls.' },
  { kw: ['트램펄린', '트램폴린'], en: 'A Korean woman testing trampoline springs and safety net tension. Indoor play facility.' },
  { kw: ['파손', '보고', '고장', '이상'], en: 'A Korean woman photographing damaged equipment, writing notes on clipboard.' },
  { kw: ['바닥', '미끄'], en: 'A Korean woman crouching to check floor mats, wiping wet spots. Clean facility.' },
  { kw: ['비상구', '대피'], en: 'Checking illuminated emergency exit signs and clear pathways. Bright modern facility.' },

  // === 청소/위생 ===
  { kw: ['청소', '빗자루', '쓸'], en: 'A Korean woman sweeping floor with a professional broom. Bright clean workspace.' },
  { kw: ['물걸레', '바닥 닦'], en: 'A Korean woman mopping tile floor with smooth motions, floor gleaming. Clean facility.' },
  { kw: ['소독', '스프레이', '살균'], en: 'A Korean woman spraying disinfectant on surfaces and wiping with cloth. Clean bright room.' },
  { kw: ['화장실', '세면'], en: 'Cleaning restroom sink, restocking toilet paper and soap. Bright modern restroom.' },
  { kw: ['쓰레기', '분리수거'], en: 'A Korean woman replacing trash bag and carrying waste to disposal area. Clean workspace.' },
  { kw: ['테이블', '의자', '카페'], en: 'A Korean woman wiping cafe tables and high chairs with disinfectant. Bright dining area.' },

  // === 오픈 준비 ===
  { kw: ['조명', '전등', '불'], en: 'Switching on bright LED lights throughout a colorful play area. Morning setup.' },
  { kw: ['음악', 'BGM'], en: 'A Korean woman adjusting background music system volume on a control panel.' },
  { kw: ['POS', '포스', '단말기'], en: 'Testing POS terminal and receipt printer at reception counter. Modern setup.' },
  { kw: ['양말', '자판기'], en: 'A Korean woman checking sock vending machine stock and restocking.' },
  { kw: ['안내 표지판', '가격표'], en: 'Placing information sign with rules and pricing at entrance. Bright lobby.' },

  // === 고객 응대 ===
  { kw: ['인사', '어서오세요', '맞이', '환영', '안녕'], en: 'A smiling Korean woman bowing warmly to welcome a family at a bright modern reception desk.' },
  { kw: ['팔찌', '밴드'], en: 'A Korean woman fastening admission wristband on a child wrist at counter.' },
  { kw: ['나이', '연령', '인원'], en: 'A Korean woman asking about child age at reception counter. Bright entrance.' },
  { kw: ['요금', '가격'], en: 'A Korean woman explaining pricing board to parents at reception desk.' },
  { kw: ['안전 수칙', '규칙', '주의'], en: 'A Korean woman showing safety rules poster to parents. Bright lobby.' },
  { kw: ['보호자', '부모', '동반', '학부모'], en: 'A Korean woman explaining guardian supervision rules to a parent at desk.' },
  { kw: ['신발장', '사물함'], en: 'A Korean woman guiding a family toward shoe lockers. Clean entrance area.' },
  { kw: ['결제', '카드'], en: 'A Korean woman processing card payment at counter terminal. Modern POS system.' },

  // === 놀이공간/아이 ===
  { kw: ['아이', '어린이', '유아', '아동', '원아'], en: 'A Korean woman kneeling at eye level with happy children in a bright colorful playroom.' },
  { kw: ['연령', '구역', '영유아존'], en: 'Leading parent and child to age-appropriate play zone. Colorful sectioned area.' },
  { kw: ['위험', '제지', '안전해요'], en: 'A Korean woman calmly redirecting a child from dangerous activity with gentle gesture.' },
  { kw: ['놀이', '게임', '활동'], en: 'A bright playroom with educational toys and art supplies on low tables. Warm lighting.' },

  // === 칭찬/격려/감정 ===
  { kw: ['칭찬', '격려', '응원'], en: 'A Korean woman giving enthusiastic thumbs-up to a happy child. Bright cheerful playroom.' },
  { kw: ['잘했어', '대단', '훌륭'], en: 'A Korean woman clapping hands with proud expression while child shows completed drawing.' },
  { kw: ['자존감', '자신감', '자기 효능'], en: 'A proud child holding up a craft project while teacher watches with encouraging smile.' },
  { kw: ['눈빛', '표정', '눈 맞', '눈높이'], en: 'A Korean woman kneeling to make warm eye contact with a child at eye level, both smiling.' },
  { kw: ['진심', '진정성', '진짜'], en: 'Close-up of a Korean woman speaking sincerely with hands on heart. Warm genuine expression.' },
  { kw: ['구체적', '명확', '디테일'], en: 'A Korean woman pointing at specific details on a childs drawing, describing what she sees.' },
  { kw: ['기계적', '반복', '습관적'], en: 'A tired-looking person giving a half-hearted response without eye contact, looking distracted.' },

  // === 소통/대화/피드백 ===
  { kw: ['소통', '대화', '경청', '들어'], en: 'A Korean woman leaning forward attentively, listening to someone with focused caring expression.' },
  { kw: ['피드백', '반응', '답변'], en: 'A Korean woman nodding thoughtfully while taking notes, responding to someone.' },
  { kw: ['말투', '어조', '목소리', '톤'], en: 'A Korean woman speaking gently with soft hand gestures to a child. Warm classroom.' },

  // === 감정/심리 ===
  { kw: ['감정', '기분', '느낌', '정서'], en: 'Colorful emotion cards on table showing happy, sad, surprised faces. Korean teacher pointing at them.' },
  { kw: ['공감', '이해', '위로'], en: 'A Korean woman sitting beside a sad child, gently patting their shoulder with care.' },
  { kw: ['동기', '의욕', '열정', '열의'], en: 'A Korean woman energetically leading a group activity with arms raised. Bright playroom.' },
  { kw: ['스트레스', '번아웃', '지침', '힘들'], en: 'A Korean woman at desk taking a calming breath with cup of tea. Soft office lighting.' },
  { kw: ['긴장', '걱정', '실수', '처음'], en: 'A Korean woman taking a deep breath at a doorway, about to enter. Warm encouraging atmosphere.' },
  { kw: ['관심', '사랑', '마음'], en: 'A Korean woman gently holding a hand-made heart card, smiling warmly. Soft bright background.' },

  // === 불만 처리 ===
  { kw: ['불만', '컴플레인'], en: 'A Korean woman listening carefully to concerned parent, nodding attentively. Reception area.' },
  { kw: ['사과', '죄송'], en: 'A Korean woman bowing apologetically to upset parent. Professional reception desk.' },
  { kw: ['매니저', '인계'], en: 'A Korean woman introducing manager for issue resolution. Professional office.' },

  // === 안전/비상 ===
  { kw: ['안전', '주의', '위험'], en: 'Safety instruction signs next to well-organized equipment. Bright facility with floor markings.' },
  { kw: ['응급', '구급', '부상'], en: 'A Korean woman opening first aid kit, preparing bandages. Bright clean room.' },
  { kw: ['화재', '소화기'], en: 'Checking fire extinguisher pressure gauge on wall. Bright modern facility corridor.' },
  { kw: ['119', '신고', '전화'], en: 'A Korean woman speaking urgently on phone during emergency situation.' },
  { kw: ['대피', '대피로', '안전하게'], en: 'A Korean woman guiding children toward emergency exit calmly. Bright hallway.' },
  { kw: ['CCTV', '보안', '모니터'], en: 'Watching CCTV monitors showing facility areas. Modern security desk.' },

  // === 마감 ===
  { kw: ['퇴장', '시간 종료'], en: 'A Korean woman approaching family showing time on tablet. Bright play area.' },
  { kw: ['정산', '매출'], en: 'Counting cash and comparing POS totals at end of day. Clean counter.' },
  { kw: ['잠금', '시건', '닫'], en: 'Locking entrance door and checking handle. Evening lighting.' },
  { kw: ['보안', '알람'], en: 'Entering code on security alarm panel. Dim evening facility.' },
  { kw: ['일지', '보고서'], en: 'A Korean woman writing in daily log book at desk. Warm desk lamp lighting.' },
  { kw: ['마무리', '정리', '퇴근', '끝'], en: 'A tidy organized workspace at end of day. Neatly arranged supplies, clean desk. Warm evening light.' },

  // === 교육/학습/가치 ===
  { kw: ['교육', '철학', '가치', '비전'], en: 'A Korean woman presenting key values and mission statement on whiteboard. Bright training room.' },
  { kw: ['윤리', '도덕', '양심'], en: 'A Korean woman thoughtfully reading an ethics handbook at a desk.' },
  { kw: ['마음가짐', '태도', '자세'], en: 'A Korean woman standing tall with confident posture at motivational board.' },
  { kw: ['사명감', '책임감', '보람'], en: 'A Korean woman smiling warmly while watching children play happily. Bright playroom.' },
  { kw: ['존중', '배려', '친절'], en: 'A Korean woman kneeling to make eye contact with a small child, gentle expression.' },
  { kw: ['성장', '발달', '배움', '학습'], en: 'A wall display with childrens artwork and growth charts. Bright cheerful hallway.' },
  { kw: ['규칙', '규정', '절차', '약속', '기준'], en: 'A Korean woman pointing at clearly posted classroom rules on wall. Organized room.' },
  { kw: ['모범', '본보기', '리더'], en: 'A Korean woman demonstrating proper behavior to children with friendly gesture.' },
  { kw: ['인성', '감사'], en: 'A warm poster showing children sharing and helping each other. Bright classroom.' },

  // === 교수법/방법 ===
  { kw: ['패턴', '공식', '방법', '기법', '기술'], en: 'A Korean woman pointing at a step-by-step framework diagram on whiteboard. Bright training room.' },
  { kw: ['효과', '결과', '변화', '영향'], en: 'A presentation board showing before-and-after comparison with positive results.' },
  { kw: ['예를 들', '예시', '예컨대', '사례'], en: 'A Korean woman presenting examples on a screen in a bright training room.' },
  { kw: ['비교', '차이', '다른', '반면'], en: 'A whiteboard showing two contrasting approaches side by side. Clean training room.' },
  { kw: ['중요', '핵심', '기억', '꼭'], en: 'A Korean woman pointing at highlighted key point with star mark on board.' },

  // === 질문/생각/경험 ===
  { kw: ['질문', '궁금', '물어', '생각해'], en: 'A Korean woman with thoughtful expression, finger on chin, looking at question on board.' },
  { kw: ['경험', '겪어', '해본', '시도'], en: 'A Korean woman gesturing as she tells a story with reflective smile. Warm cozy room.' },

  // === 집중/관찰 ===
  { kw: ['집중', '몰입', '집중력'], en: 'A child deeply focused on building with colorful blocks while teacher observes quietly.' },
  { kw: ['관찰', '지켜', '바라보'], en: 'A Korean woman quietly observing children playing from a distance. Bright open playroom.' },

  // === 미술/창작 ===
  { kw: ['크래용', '색연필', '그림', '그리', '미술'], en: 'A child drawing with colorful crayons at a low table. Korean teacher admiring the artwork.' },

  // === 도구/자료 ===
  { kw: ['도구', '자료', '교구', '재료'], en: 'An organized shelf with labeled educational materials and colorful teaching aids.' },

  // === 탐구/호기심 ===
  { kw: ['레지오', '에밀리아', '탐구', '호기심', '발견', '자기발견'], en: 'Children exploring nature items on table - leaves, rocks, magnifying glass. Korean teacher observing with smile.' },

  // === 언어 ===
  { kw: ['언어', '영어', '베트남'], en: 'A colorful classroom wall with multilingual posters in Korean, English and Vietnamese.' },

  // === 건강/운동 ===
  { kw: ['건강', '운동', '신체'], en: 'A Korean woman leading group exercise activity with children in a bright play room.' },

  // === 예민/민감 ===
  { kw: ['예민', '민감', '섬세'], en: 'A Korean woman gently approaching a shy child, crouching low with soft caring expression.' },

  // === 음식 ===
  { kw: ['음식', '식사', '간식', '요리'], en: 'A clean kitchen counter with healthy snacks on colorful plates. Bright modern kitchen.' },

  // === 소개/시작/요약 ===
  { kw: ['배우겠', '알아보', '살펴', '시작하겠', '시작'], en: 'A Korean woman at podium warmly introducing a training topic. Bright modern training room.' },
  { kw: ['안녕하세요', '소개', '환영합니다'], en: 'A Korean woman standing at podium area, warmly introducing training session.' },
  { kw: ['요약', '복습'], en: 'A whiteboard with colorful bullet points and key takeaways. Bright meeting room.' },

  // === 교사/선생님 ===
  { kw: ['교사', '선생님', '교직원'], en: 'A Korean woman standing proudly in uniform at classroom entrance. Bright clean hallway.' },

  // === 팀/동료 ===
  { kw: ['팀워크', '협력', '동료', '팀'], en: 'Two Korean women in uniforms discussing at a round table. Bright meeting room.' },
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
const BASE_SETTING = 'Candid photo in a bright, clean modern Korean workplace. Professional staff in neat uniform. Warm natural lighting, clean safe interior. Shot on Canon EOS R5, 35mm lens, f/2.8, natural window lighting.';
const NEGATIVE_PROMPT = 'nude, naked, nsfw, shirtless, undressed, revealing, suggestive, violent, gore, blood, weapon, scary, horror, dark, inappropriate, doctor, lab coat, medical, hospital, stethoscope, clinic, nurse, surgery, patient, examination room, military, police, judge, lawyer, courtroom, prison, tattoo, piercing, smoking, alcohol, drugs, deformed, ugly, blurry, bad anatomy, extra limbs';
const QUALITY_SUFFIX = 'Raw photo, no AI artifacts, natural skin texture, realistic lighting, 8k uhd.';

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
  const fallbackSection = section || '교육';
  return `${camera}A Korean woman in professional uniform explaining about "${fallbackSection}" in a bright modern workspace. Clean organized interior, warm natural lighting. ${QUALITY_SUFFIX}`;
}

/**
 * 나레이션에서 액션 추출 (api/image.js의 buildScenePrompts용)
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
