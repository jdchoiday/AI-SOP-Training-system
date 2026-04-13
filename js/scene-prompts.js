// ============================================
// 통합 씬 프롬프트 매핑 (Single Source of Truth)
// ============================================
// 하이브리드 전략: 정적 키워드 매핑 + AI 동적 프롬프트
// - 다양한 시각 타입: 실사, 인포그래픽, 비교도, 클로즈업, 다이어그램
// - Gemini 동적 프롬프트가 1순위, 이 파일이 폴백
// ============================================

const CHAR = 'A friendly young Korean woman in her 20s wearing a light blue polo shirt and beige apron with a name tag, kids cafe staff';
const CHAR_SHORT = 'A young Korean woman in a light blue polo shirt and beige apron';

// ===== 시각 스타일 프리셋 =====
const VISUAL_STYLES = {
  photo:      'Candid editorial photography, natural skin texture, realistic warm lighting, 8k uhd.',
  infographic:'Clean flat-design infographic illustration, pastel color palette, bold icons, white background, educational poster style, vector art, 4k.',
  diagram:    'Professional flowchart diagram with rounded boxes and arrows, clean modern design, corporate blue-green palette, white background, 4k.',
  comparison: 'Split-screen comparison layout, left side labeled BEFORE / right side labeled AFTER, clean divider line, well-lit professional photography, 8k uhd.',
  closeup:    'Extreme macro close-up photography, shallow depth of field f/1.8, crisp detail, warm natural lighting, 8k uhd.',
  emotion:    'Expressive portrait photography, shallow depth of field, warm golden hour light, genuine emotion captured, 8k uhd.',
  overhead:   'Flat-lay overhead photography, neatly arranged items on clean surface, soft diffused lighting, minimalist style, 8k uhd.',
  wide:       'Wide establishing shot, architectural interior photography, leading lines, warm ambient lighting, 8k uhd.',
  cinematic:  'Cinematic 16:9 frame, dramatic warm lighting, film grain, shallow DOF, anamorphic lens flare, 8k.',
  cartoon:    'Cute kawaii illustration style, rounded shapes, cheerful pastel colors, child-friendly educational art, 4k.',
};

const SCENE_MAP = [
  // === 위생/손씻기 === (다양한 시각 타입)
  { kw: ['손 씻', '손씻', '비누', 'soap', '세정', '손을'],
    en: `Extreme close-up of hands being lathered with soap under crystal-clear running water, tiny bubbles glistening. Stainless steel kitchen sink with warm overhead spotlight.`,
    style: 'closeup' },
  { kw: ['손바닥', '문질러', '문지르'],
    en: 'Step-by-step hand washing infographic: 6 numbered circles showing palm rubbing, finger interlacing, thumb rotation, nail scrubbing, wrist wash, rinse. Clean medical illustration style.',
    style: 'infographic' },
  { kw: ['손가락', '손톱', '엄지'],
    en: 'Macro close-up of fingernails being scrubbed with a nail brush under soapy water. Bright soft lighting, water droplets visible.',
    style: 'closeup' },
  { kw: ['세균', '감염', '예방', '균'],
    en: 'Colorful educational infographic showing bacteria magnified in a circle, crossed out with a red X. Surrounding icons: soap, water, timer (20 seconds), clean hands. White background.',
    style: 'infographic' },

  // === 출근/준비 === (시네마틱 + 감정)
  { kw: ['출근', '도착', '입장'],
    en: `${CHAR_SHORT} pushing open a glass entrance door, morning golden sunlight streaming in behind her. Modern kids cafe lobby with colorful balloon arch. Silhouette backlit.`,
    style: 'cinematic' },
  { kw: ['체크인', '기록'],
    en: `Close-up of a finger tapping an RFID card on a sleek wall-mounted digital time clock showing "09:00 AM". Green LED check mark appears.`,
    style: 'closeup' },
  { kw: ['유니폼', '갈아입'],
    en: `${CHAR_SHORT} adjusting her apron in front of a locker room mirror, pinning a name tag. Reflection shows her determined smile. Wooden lockers, warm pendant light.`,
    style: 'emotion' },
  { kw: ['명찰', '이름표'],
    en: `Extreme close-up of cute illustrated name tag being pinned onto a beige apron pocket. Name tag has a small star sticker. Shallow depth of field.`,
    style: 'closeup' },
  { kw: ['머리', '묶'],
    en: `Profile shot of ${CHAR_SHORT} tying her hair into a neat ponytail, hands mid-motion. Mirror reflection visible. Warm cozy staff changing area.`,
    style: 'emotion' },
  { kw: ['액세서리', '반지', '귀걸이'],
    en: 'Flat-lay overhead photo of small jewelry items (rings, earrings, bracelet) placed neatly in a wooden tray next to a locker key. Clean minimalist.',
    style: 'overhead' },

  // === 점검/확인 === (다이어그램 + 실사)
  { kw: ['점검', '체크', '확인', '살피'],
    en: `${CHAR_SHORT} holding a tablet with a digital checklist (green checkmarks visible on screen), standing in front of a colorful indoor playground. Purposeful focused expression.`,
    style: 'photo' },
  { kw: ['놀이기구', '미끄럼틀'],
    en: `${CHAR_SHORT} crouching to inspect the joints of a colorful plastic slide, using a small flashlight. Indoor kids playground with foam mats. Professional safety inspection feel.`,
    style: 'photo' },
  { kw: ['볼풀'],
    en: `Top-down overhead shot of a ball pit full of vibrant red, blue, yellow, green plastic balls. ${CHAR_SHORT}'s hands visible at edge, reaching in to check for debris.`,
    style: 'overhead' },
  { kw: ['트램펄린', '트램폴린'],
    en: `${CHAR_SHORT} pressing firmly on a trampoline surface, testing bounce tension. Safety net visible in background. Indoor play center with bright LED strip lighting.`,
    style: 'photo' },
  { kw: ['파손', '보고', '고장', '이상'],
    en: 'Flowchart diagram: "Damage Found" → "Take Photo" → "Fill Report Form" → "Notify Manager" → "Mark Equipment". Clean blue-green corporate design with icons.',
    style: 'diagram' },
  { kw: ['바닥', '미끄'],
    en: `Low-angle shot of ${CHAR_SHORT} crouching to inspect soft foam floor mats, wiping a spot with a cloth. Colorful play equipment towers in background, dramatic perspective.`,
    style: 'cinematic' },
  { kw: ['비상구', '대피'],
    en: 'A glowing green emergency EXIT sign illuminated above a door. Long bright corridor with colorful walls stretching into distance. Dramatic symmetrical composition.',
    style: 'cinematic' },

  // === 청소/위생 === (비교 + 클로즈업)
  { kw: ['청소', '빗자루', '쓸'],
    en: 'Split-screen BEFORE/AFTER comparison: left shows scattered crumbs and toys on floor, right shows spotless clean floor with neatly arranged furniture. Same angle, bright kids cafe.',
    style: 'comparison' },
  { kw: ['물걸레', '바닥 닦'],
    en: `${CHAR_SHORT} mopping a tile floor in smooth figure-eight motions. Wet gleam visible on clean section. Bright cafe area, chairs stacked neatly. Motion blur on mop.`,
    style: 'cinematic' },
  { kw: ['소독', '스프레이', '살균'],
    en: `Close-up of a gloved hand spraying sanitizer mist onto a table surface, droplets suspended mid-air catching the light. Yellow microfiber cloth ready nearby.`,
    style: 'closeup' },
  { kw: ['화장실', '세면'],
    en: 'A spotless family restroom: child-sized white sink with colorful soap dispenser shaped like a duck, paper towel holder, step stool. Bright cheerful tiles, everything sparkling clean.',
    style: 'wide' },
  { kw: ['쓰레기', '분리수거'],
    en: 'Infographic showing 4 color-coded recycling bins with icons: blue (paper), green (glass), yellow (plastic), gray (general waste). Clean flat design with Korean/English labels.',
    style: 'infographic' },
  { kw: ['테이블', '의자', '카페'],
    en: `${CHAR_SHORT} wiping a wooden cafe table with a white cloth, sunlight streaming through window creating warm streaks. High chairs arranged, pendant lights glowing.`,
    style: 'photo' },

  // === 오픈 준비 ===
  { kw: ['조명', '전등', '불'],
    en: 'Dramatic wide shot: colorful LED lights turning on one section at a time across a large indoor kids playground. Dark to bright transition, magical morning feel.',
    style: 'cinematic' },
  { kw: ['음악', 'BGM'],
    en: `Close-up of ${CHAR_SHORT}'s finger adjusting volume on a small white Bluetooth speaker. Subtle music note icons floating from speaker (subtle graphic overlay). Reception counter.`,
    style: 'closeup' },
  { kw: ['POS', '포스', '단말기'],
    en: `Close-up of a touchscreen POS register showing a colorful menu interface. ${CHAR_SHORT}'s hand tapping a test transaction button. Receipt printer with paper curling out.`,
    style: 'closeup' },
  { kw: ['양말', '자판기'],
    en: `${CHAR_SHORT} neatly restocking rows of colorful kids socks into a small vending machine display. Organized by size and color. Kids cafe lobby entrance.`,
    style: 'photo' },
  { kw: ['안내 표지판', '가격표'],
    en: 'A cheerful illustrated pricing and rules sign with large numbers, cute icons (clock, sock, child), and 3 languages (Korean/English/Vietnamese). Bright welcome lobby.',
    style: 'cartoon' },

  // === 고객 응대 === (감정 + 시네마틱)
  { kw: ['인사', '어서오세요', '맞이', '환영', '안녕'],
    en: `${CHAR} smiling radiantly and bowing to welcome a family (parents and small child) at a colorful front desk. Child is looking up with wonder. Warm backlight from entrance.`,
    style: 'emotion' },
  { kw: ['팔찌', '밴드'],
    en: `Extreme close-up of ${CHAR_SHORT}'s gentle hands fastening a bright orange paper wristband on a tiny child's wrist. Child's excited face blurred in background.`,
    style: 'closeup' },
  { kw: ['나이', '연령', '인원'],
    en: 'Cute illustrated age guide chart showing: baby (0-2), toddler (3-4), child (5-7) with height comparisons, play zone recommendations, and colored wristband codes.',
    style: 'infographic' },
  { kw: ['요금', '가격'],
    en: `${CHAR_SHORT} pointing at a large colorful pricing board with clear tier graphics while explaining to attentive parents. Modern kids cafe reception with bright signage.`,
    style: 'photo' },
  { kw: ['안전 수칙', '규칙', '주의'],
    en: 'Large illustrated safety rules poster: 5 icons showing "No running", "Socks required", "Parent supervision", "No food in play area", "Report injuries". Kawaii style.',
    style: 'cartoon' },
  { kw: ['보호자', '부모', '동반', '학부모'],
    en: `${CHAR_SHORT} having a warm one-on-one conversation with a parent at a cozy cafe table. Two coffee cups between them. Bokeh lights in background. Genuine connection.`,
    style: 'emotion' },
  { kw: ['신발장', '사물함'],
    en: 'Rows of colorful shoe lockers with numbered doors, small feet stepping onto soft foam flooring. Clean organized entrance area with bright overhead lighting.',
    style: 'wide' },
  { kw: ['결제', '카드'],
    en: `Close-up of a contactless card payment on a modern POS terminal, small green checkmark appearing on screen. ${CHAR_SHORT}'s professional smile blurred in background.`,
    style: 'closeup' },

  // === 놀이공간/아이 === (감정 + 오버헤드)
  { kw: ['발달', '개월', '발육', '성장단계'],
    en: 'Developmental milestone infographic: 4 columns (6mo, 12mo, 18mo, 24mo) showing baby abilities with cute illustrations — sitting, crawling, walking, talking. Pastel colors.',
    style: 'infographic' },
  { kw: ['아이', '어린이', '유아', '아동', '원아'],
    en: `${CHAR_SHORT} kneeling at eye level with two happy small children in a bright colorful indoor playground. Children reaching toward a ball pit. Natural candid moment captured.`,
    style: 'emotion' },
  { kw: ['연령', '구역', '영유아존'],
    en: 'Overhead floor plan diagram of kids cafe zones: baby area (pink), toddler area (green), active play (blue), art zone (yellow), parent lounge (gray). Clean architectural layout.',
    style: 'diagram' },
  { kw: ['위험', '제지', '안전해요'],
    en: `${CHAR_SHORT} gently catching a toddler's hand near the edge of a raised platform, redirecting them with a calm reassuring smile. Indoor playground with safety mats below.`,
    style: 'emotion' },
  { kw: ['놀이', '게임', '활동'],
    en: 'A bright colorful indoor playroom: ball pit in background, building blocks on low tables, art easel with paints, climbing structure. No people — focus on the inviting space.',
    style: 'wide' },

  // === 칭찬/격려/감정 === (감정 포커스 + 인포그래픽)
  { kw: ['칭찬', '격려', '응원'],
    en: `${CHAR_SHORT} giving an enthusiastic double high-five to a beaming happy child at eye level. Both faces lit up with genuine joy. Colorful playroom, bokeh background.`,
    style: 'emotion' },
  { kw: ['잘했어', '대단', '훌륭'],
    en: `Split-screen: left shows ${CHAR_SHORT} clapping with proud expression, right shows close-up of child's crayon drawing being held up proudly. Warm art room light.`,
    style: 'comparison' },
  { kw: ['자존감', '자신감', '자기 효능'],
    en: 'Infographic: "Building Child Confidence" — 5 step pyramid from bottom: Safety → Belonging → Praise → Challenge → Independence. Warm gradient colors, friendly icons.',
    style: 'infographic' },
  { kw: ['눈빛', '표정', '눈 맞', '눈높이'],
    en: `Intimate close-up portrait: ${CHAR_SHORT} kneeling to make warm eye contact with a small child. Both faces in sharp focus, genuine warm smiles. Soft bokeh playroom behind.`,
    style: 'emotion' },
  { kw: ['진심', '진정성', '진짜'],
    en: `Tight portrait of ${CHAR_SHORT} speaking sincerely, both hands naturally on her heart. Eyes warm and genuine. Soft blurred pastel background. Emotional authentic moment.`,
    style: 'emotion' },
  { kw: ['구체적', '명확', '디테일'],
    en: `Over-the-shoulder shot: ${CHAR_SHORT} leaning over a table, finger pointing at a specific part of a child's colorful drawing. Child watching intently. Art supplies scattered around.`,
    style: 'photo' },
  { kw: ['기계적', '반복', '습관적'],
    en: 'Split comparison: LEFT (red X) — person giving distracted thumbs-up looking at phone, dull gray mood. RIGHT (green check) — teacher making genuine eye contact, warm golden light.',
    style: 'comparison' },

  // === 소통/대화/피드백 ===
  { kw: ['소통', '대화', '경청', '들어'],
    en: `Two-shot: ${CHAR_SHORT} leaning forward attentively at a round wooden table, actively listening with engaged expression. Cozy cafe area, two warm drinks on table.`,
    style: 'emotion' },
  { kw: ['피드백', '반응', '답변'],
    en: 'Circular feedback loop diagram: Listen → Understand → Respond → Follow-up → Listen. Teal and amber color scheme, clean modern icons.',
    style: 'diagram' },
  { kw: ['말투', '어조', '목소리', '톤'],
    en: 'Comparison infographic: 3 speech bubbles with different tones — harsh (red, angular), neutral (gray, plain), warm (green, rounded with heart). "Choose Your Tone" header.',
    style: 'infographic' },

  // === 감정/심리 === (다양한 시각 표현)
  { kw: ['감정', '기분', '느낌', '정서'],
    en: 'Flat-lay overhead photo of colorful laminated emotion cards spread on a light wooden table: happy, sad, angry, surprised, scared, calm faces. Bright soft lighting.',
    style: 'overhead' },
  { kw: ['공감', '이해', '위로'],
    en: `${CHAR_SHORT} sitting cross-legged on the floor beside a teary-eyed child, gently placing a hand on their shoulder. Warm golden light from window. Tender intimate moment.`,
    style: 'emotion' },
  { kw: ['동기', '의욕', '열정', '열의'],
    en: `Dynamic wide shot: ${CHAR_SHORT} energetically raising arms leading a group of laughing children in a circle activity. Motion blur on spinning kids. Colorful indoor playground.`,
    style: 'cinematic' },
  { kw: ['스트레스', '번아웃', '지침', '힘들'],
    en: `${CHAR_SHORT} sitting alone at a wooden break room table, cradling a warm cup of tea, eyes closed taking a calm breath. Warm lamp light. Peaceful self-care moment.`,
    style: 'emotion' },
  { kw: ['긴장', '걱정', '실수', '처음'],
    en: `${CHAR_SHORT} standing at a doorway taking a deep breath, one hand on the door frame. Through the doorway: a bright welcoming playroom. Cinematic framing — threshold moment.`,
    style: 'cinematic' },
  { kw: ['관심', '사랑', '마음'],
    en: `Close-up of ${CHAR_SHORT}'s hands holding a small hand-made heart card from a child. Card has crayon scribbles and glitter. Soft warm bokeh background.`,
    style: 'closeup' },

  // === 불만 처리 === (플로우차트 + 실사)
  { kw: ['불만', '컴플레인'],
    en: 'Complaint handling flowchart: "Listen Calmly" → "Acknowledge" → "Apologize" → "Solve / Escalate" → "Follow-up". Professional blue-gray design with empathy icons.',
    style: 'diagram' },
  { kw: ['사과', '죄송'],
    en: `${CHAR_SHORT} bowing apologetically to a parent at the reception desk, sincere regretful expression. Parent's posture softening. Reception desk with warm lighting.`,
    style: 'emotion' },
  { kw: ['매니저', '인계'],
    en: `${CHAR_SHORT} gesturing to introduce a colleague in a dark navy polo shirt (manager) to handle a situation. Three people at cafe counter. Professional hand-off moment.`,
    style: 'photo' },

  // === 안전/비상 === (인포그래픽 + 다이어그램)
  { kw: ['안전', '주의', '위험'],
    en: 'Safety priority infographic: large triangle divided into 3 tiers — top: "Prevent" (green shield), middle: "Detect" (yellow eye), bottom: "Respond" (red cross). Bold clean design.',
    style: 'infographic' },
  { kw: ['응급', '구급', '부상'],
    en: 'Overhead flat-lay of an opened white first aid kit: bandages, antiseptic wipes, cold pack, gloves, scissors neatly arranged. Clean white surface with red cross icon.',
    style: 'overhead' },
  { kw: ['화재', '소화기'],
    en: 'Fire extinguisher usage infographic: 4 steps — Pull pin, Aim at base, Squeeze handle, Sweep side-to-side. Red and white emergency design with clear icons.',
    style: 'infographic' },
  { kw: ['119', '신고', '전화'],
    en: `${CHAR_SHORT} speaking urgently but calmly on phone, one hand pointing at an emergency procedure poster on the wall showing "119" in large red numbers.`,
    style: 'photo' },
  { kw: ['대피', '대피로', '안전하게'],
    en: 'Building evacuation route diagram: top-down floor plan with green arrows showing exit paths, assembly point marked with star, fire extinguisher locations marked. Clean design.',
    style: 'diagram' },
  { kw: ['CCTV', '보안', '모니터'],
    en: 'A staff desk with four CCTV monitor screens showing different angles of a colorful kids playground. Dark room, screens glowing with live feeds. Security office feel.',
    style: 'cinematic' },

  // === 마감 ===
  { kw: ['퇴장', '시간 종료'],
    en: `${CHAR_SHORT} approaching a family, gesturing gently at a digital clock on the wall showing closing time. Child looking reluctant, parent nodding. Warm evening light.`,
    style: 'photo' },
  { kw: ['정산', '매출'],
    en: `Close-up of POS screen showing end-of-day sales summary with colorful bar chart. ${CHAR_SHORT}'s hand counting cash in the register. Evening cafe counter.`,
    style: 'closeup' },
  { kw: ['잠금', '시건', '닫'],
    en: 'A hand turning a key in a glass entrance door lock, warm orange evening light reflected in glass. Kids cafe entrance from outside, interior lights dimming.',
    style: 'cinematic' },
  { kw: ['보안', '알람'],
    en: 'Close-up of fingers entering a security code on a modern keypad panel. Green LED confirms armed status. Dim evening kids cafe entrance behind.',
    style: 'closeup' },
  { kw: ['일지', '보고서'],
    en: `Overhead shot of ${CHAR_SHORT}'s hands writing in a daily log notebook. Pen, checklist, and a warm cup of tea on a wooden desk. Cozy warm desk lamp glow.`,
    style: 'overhead' },
  { kw: ['마무리', '정리', '퇴근', '끝'],
    en: 'Cinematic wide shot: a perfectly tidy kids cafe reception counter at golden hour. Neatly arranged items, chairs stacked, warm sunset light through windows. End of day serenity.',
    style: 'cinematic' },

  // === 교육/학습/가치 ===
  { kw: ['교육', '철학', '가치', '비전'],
    en: 'Vision & values infographic: central "Our Mission" circle surrounded by 4 pillars — Safety, Growth, Joy, Care — each with icon and keyword. Warm emerald-gold palette.',
    style: 'infographic' },
  { kw: ['윤리', '도덕', '양심'],
    en: `${CHAR_SHORT} thoughtfully reading an employee handbook at a round wooden table, sunlight falling across the pages. Cozy bright staff meeting room.`,
    style: 'photo' },
  { kw: ['마음가짐', '태도', '자세'],
    en: `Powerful portrait: ${CHAR_SHORT} standing tall with confident posture, arms at side, warm determined smile. Motivational poster visible behind: "Every Day Counts". Bright staff room.`,
    style: 'emotion' },
  { kw: ['사명감', '책임감', '보람'],
    en: `${CHAR_SHORT} standing by a window, watching children play happily through the glass. Her reflection shows a satisfied proud smile. Warm golden interior light.`,
    style: 'cinematic' },
  { kw: ['존중', '배려', '친절'],
    en: `${CHAR_SHORT} kneeling to gently help a small shy child put on indoor slippers. Eye level, genuine warm caring expression. Soft entryway light.`,
    style: 'emotion' },
  { kw: ['성장', '발달', '배움', '학습'],
    en: 'A hallway wall display: timeline of children artwork from scribbles to detailed drawings, growth photos at different months, star stickers and ribbons. Cheerful bright atmosphere.',
    style: 'wide' },
  { kw: ['규칙', '규정', '절차', '약속', '기준'],
    en: 'Illustrated rules poster with numbered steps and cute icons: 1. Check in, 2. Wear socks, 3. Follow age zones, 4. Parent stays, 5. Clean up. Kawaii educational style.',
    style: 'cartoon' },
  { kw: ['모범', '본보기', '리더'],
    en: `${CHAR_SHORT} demonstrating how to properly pick up toys and place them in labeled bins. Three watching children mimicking her actions. Bright organized playroom.`,
    style: 'photo' },
  { kw: ['인성', '감사'],
    en: 'Warm illustrated poster: cartoon children sharing toys, helping a fallen friend, saying "thank you" in speech bubbles. Heart-shaped border. Bright pastel classroom wall.',
    style: 'cartoon' },

  // === 교수법/방법 ===
  { kw: ['패턴', '공식', '방법', '기법', '기술'],
    en: 'Process diagram: 5 connected hexagons showing method steps with arrows between them. Each hexagon has an icon and short label. Clean teal-gray professional design.',
    style: 'diagram' },
  { kw: ['효과', '결과', '변화', '영향'],
    en: 'Before-and-after comparison board: LEFT shows messy/disorganized approach with frown emoji, RIGHT shows structured organized approach with star emoji. Clean presentation style.',
    style: 'comparison' },
  { kw: ['예를 들', '예시', '예컨대', '사례'],
    en: `${CHAR_SHORT} presenting real case examples on a large TV screen showing photos and bullet points. Bright cozy training room with round table and attentive colleagues.`,
    style: 'photo' },
  { kw: ['비교', '차이', '다른', '반면'],
    en: 'Split-screen comparison: LEFT panel with red tint showing wrong approach, RIGHT panel with green tint showing correct approach. Clear labels and icons. Educational layout.',
    style: 'comparison' },
  { kw: ['중요', '핵심', '기억', '꼭'],
    en: 'Key takeaway callout box: large golden star icon with "KEY POINT" header, 3 bullet points with checkmarks below. Clean bold typography on dark background with spotlight effect.',
    style: 'infographic' },

  // === 질문/생각/경험 ===
  { kw: ['질문', '궁금', '물어', '생각해'],
    en: `${CHAR_SHORT} with a genuinely thoughtful expression, finger on chin, looking up at a large question mark drawn on a whiteboard. Bright airy room with natural light.`,
    style: 'emotion' },
  { kw: ['경험', '겪어', '해본', '시도'],
    en: `${CHAR_SHORT} gesturing expressively while telling a story to engaged colleagues sitting in a circle. Coffee cups in hand. Warm cozy meeting room, morning light.`,
    style: 'photo' },

  // === 집중/관찰 ===
  { kw: ['집중', '몰입', '집중력'],
    en: 'A small child deeply focused on building a tall tower with colorful wooden blocks. Shallow depth of field — child sharp, background softly blurred. Teacher watching from distance.',
    style: 'cinematic' },
  { kw: ['관찰', '지켜', '바라보'],
    en: `${CHAR_SHORT} quietly observing children from behind a pillar, holding a small notebook. Children playing naturally, unaware of being watched. Documentary photography style.`,
    style: 'cinematic' },

  // === 미술/창작 ===
  { kw: ['크래용', '색연필', '그림', '그리', '미술'],
    en: 'Overhead flat-lay of a child art table: colorful crayon drawings, paint cups, brushes, glitter glue, small hands mid-creation. Bright cheerful mess of creativity.',
    style: 'overhead' },

  // === 도구/자료 ===
  { kw: ['도구', '자료', '교구', '재료'],
    en: 'Organized wooden shelves with neatly labeled bins of educational toys, art supplies, and colorful teaching materials. Each bin has a picture label. Montessori-style organized.',
    style: 'wide' },

  // === 탐구/호기심 ===
  { kw: ['레지오', '에밀리아', '탐구', '호기심', '발견', '자기발견'],
    en: 'Small children curiously examining nature items on a light table — leaves, pinecones, shells under a magnifying glass. Warm fascinated expressions. Reggio-inspired learning.',
    style: 'photo' },

  // === 언어 ===
  { kw: ['언어', '영어', '베트남'],
    en: 'Colorful multilingual flashcard wall display: Korean, English, Vietnamese words paired with cute illustrations. "Hello / 안녕 / Xin chào" prominently featured. Bright classroom.',
    style: 'wide' },

  // === 건강/운동 ===
  { kw: ['건강', '운동', '신체'],
    en: `Dynamic shot: ${CHAR_SHORT} leading a line of small children in fun animal-walk exercises (bear crawl, frog jumps) on soft mats. Motion blur, energetic joyful atmosphere.`,
    style: 'cinematic' },

  // === 예민/민감 ===
  { kw: ['예민', '민감', '섬세'],
    en: `Tender close-up: ${CHAR_SHORT} very gently and slowly approaching a shy child sitting alone in a corner. Crouching low, soft caring smile, non-threatening body language.`,
    style: 'emotion' },

  // === 음식 ===
  { kw: ['음식', '식사', '간식', '요리'],
    en: 'Overhead flat-lay of a kids cafe snack spread: cute animal-shaped sandwiches, fruit cups, juice boxes arranged on colorful plates. Bright cheerful food photography style.',
    style: 'overhead' },

  // === 소개/시작/요약 ===
  { kw: ['배우겠', '알아보', '살펴', '시작하겠', '시작'],
    en: `${CHAR_SHORT} standing confidently in front of a large TV screen showing a title slide, welcoming gesture with open arms. Cozy meeting room with seated colleagues.`,
    style: 'photo' },
  { kw: ['안녕하세요', '소개', '환영합니다'],
    en: `${CHAR} standing at the front of a cozy meeting room, warmly greeting with a bright wave. "Welcome" displayed on screen behind. Round table with notepads.`,
    style: 'emotion' },
  { kw: ['요약', '복습'],
    en: 'Summary infographic: numbered key takeaways with checkmark icons, color-coded categories, and a "Remember!" banner at top. Clean organized educational poster design.',
    style: 'infographic' },

  // === 교사/선생님 ===
  { kw: ['교사', '선생님', '교직원'],
    en: `${CHAR} standing proudly at the entrance of a colorful kids classroom, name tag visible, arms crossed with confident warm smile. Bright hallway with children artwork.`,
    style: 'emotion' },

  // === 팀/동료 ===
  { kw: ['팀워크', '협력', '동료', '팀'],
    en: 'Two Korean women in matching light blue polo shirts and aprons, fist-bumping with smiles across a round wooden table. Coffee cups, planning papers. Warm cozy meeting room.',
    style: 'emotion' },
];

// 카메라 앵글 배열
const CAMERA_ANGLES = [
  'Wide establishing shot,',
  'Medium shot,',
  'Close-up detail shot,',
  'Over-the-shoulder shot,',
  'Low angle shot,',
  'Eye-level shot,',
  'Top-down overhead shot,',
  'Dutch angle shot,',
];

// 기본 세팅 & 네거티브 프롬프트
const BASE_SETTING = 'Candid photo in a bright modern workplace. Warm natural lighting. Shot on Canon EOS R5, 35mm lens, f/2.8, natural window lighting.';
const NEGATIVE_PROMPT = 'nude, naked, nsfw, shirtless, revealing, suggestive, sexual, deformed, ugly, blurry, bad anatomy, extra limbs, text overlay, watermark';

/**
 * 한국어 나레이션 → 영어 이미지 프롬프트 변환 (개선 v2)
 * - 매칭된 씬의 style에 맞는 품질 접미사 자동 적용
 * - 동일 키워드도 다양한 시각 스타일로 표현
 * @param {string} narration - 한국어 나레이션 텍스트
 * @param {string} [section] - 섹션 제목 (optional)
 * @param {object} [options] - { withCamera: boolean, cameraIndex: number }
 * @returns {string} 영어 이미지 프롬프트
 */
function narrationToPrompt(narration, section, options) {
  const text = ((narration || '') + ' ' + (section || '')).toLowerCase();
  const opts = options || {};

  // 카메라 앵글 선택 (실사 스타일에만 적용)
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
    const style = bestMatch.style || 'photo';
    const suffix = VISUAL_STYLES[style] || VISUAL_STYLES.photo;
    // 인포그래픽/다이어그램에는 카메라 앵글 불필요
    const useCamera = ['photo', 'emotion', 'cinematic', 'wide'].includes(style) ? camera : '';
    return `${useCamera}${bestMatch.en} ${suffix}`;
  }

  // fallback: 일반 교육 장면
  return `${camera}${CHAR_SHORT} explaining a topic in front of a whiteboard in a bright cozy training room with round table. ${VISUAL_STYLES.photo}`;
}

/**
 * 나레이션에서 액션 추출
 * 여러 매칭된 액션을 score 순으로 반환
 */
function extractActions(text) {
  const matches = [];
  for (const s of SCENE_MAP) {
    const count = s.kw.filter(k => text.includes(k)).length;
    if (count > 0) matches.push({ kw: s.kw, en: s.en, style: s.style || 'photo', score: count });
  }
  matches.sort((a, b) => b.score - a.score);
  return matches;
}

/**
 * AI 동적 프롬프트 생성을 위한 시각 타입 분석 프롬프트
 * Gemini에게 보낼 메타 프롬프트를 생성
 * @param {string} narration - 나레이션 텍스트
 * @param {number} sceneIndex - 씬 번호
 * @param {number} totalScenes - 전체 씬 수
 * @returns {string} Gemini 메타 프롬프트
 */
function buildSmartVisualPrompt(narration, sceneIndex, totalScenes) {
  return `당신은 교육 영상의 시각 디렉터입니다.

다음 나레이션에 가장 적합한 이미지를 생성해주세요.

나레이션: "${narration}"
씬: ${(sceneIndex || 0) + 1}/${totalScenes || 10}

시각 타입 선택 기준 (반드시 다양하게 사용):
- 절차/순서 설명 → 단계별 인포그래픽 (번호 매겨진 아이콘 배열)
- 올바른/잘못된 비교 → 좌우 분할 비교 이미지 (BEFORE/AFTER)
- 감정/관계 장면 → 인물 중심 감정 사진 (얕은 심도, 따뜻한 조명)
- 도구/재료 → 오버헤드 플랫레이 사진 (깔끔하게 배치된 물건들)
- 안전/규칙 → 일러스트 포스터 (아이콘 + 텍스트)
- 행동/동작 → 시네마틱 모션 사진 (모션블러, 드라마틱 앵글)
- 핵심 요약 → 키포인트 인포그래픽 (별표, 체크마크)
- 그 외 → 실제 키즈카페 장면 사진

장면 요구사항:
- 나레이션의 **핵심 교육 내용**을 시각적으로 전달 (배경 분위기가 아닌 핵심 행동/개념)
- 인물 등장 시: 20대 한국인 여성, 라이트블루 폴로셔츠와 베이지색 앞치마 (키즈카페 직원)
- 아이 등장 시: 실제 한국 유아/어린이
- 장소: 밝은 현대적 키즈카페/실내놀이터/교육실
- 16:9 가로 비율
- 외설적이거나 폭력적인 내용 절대 금지

**이전 씬과 다른 시각 타입**을 사용하여 다양성을 유지하세요.`;
}

// Node.js (api/image.js)에서 사용
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SCENE_MAP, CAMERA_ANGLES, BASE_SETTING, NEGATIVE_PROMPT, VISUAL_STYLES, narrationToPrompt, extractActions, buildSmartVisualPrompt };
}

// 브라우저 (admin/index.html, ai-provider.js)에서 사용
if (typeof window !== 'undefined') {
  window.ScenePrompts = { SCENE_MAP, CAMERA_ANGLES, BASE_SETTING, NEGATIVE_PROMPT, VISUAL_STYLES, narrationToPrompt, extractActions, buildSmartVisualPrompt };
}
