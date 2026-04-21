// ============================================
// Scene Normalizer — 단일 소스 오브 트루스
// ============================================
// 스크립트가 컴포넌트 경계를 넘을 때마다 호출 (slide-player 로드 / admin 저장 / admin 재생 전)
// • 레거시 video_scenario → keypoint 변환
// • 미지원 type → title_card(첫/끝) 또는 keypoint(중간)
// • 필수 필드 누락 시 타입 자동 강등 (barchart without values → keypoint)
// • Pexels 영상 흔적 필드 제거 (video_keywords 등)
// • 나레이션만 있는 씬: _narrationOnly=true 플래그 → 비주얼 중복 방지
// ============================================

(function() {
  const VALID_TYPES = [
    'title_card', 'stat', 'barchart', 'rankingBoard', 'comparison',
    'infographic', 'iconGrid', 'conceptExplainer', 'quote', 'keypoint'
  ];

  const LEGACY_TYPE_MAP = {
    video_scenario: 'keypoint',
  };

  const LEGACY_FIELDS = [
    'video_keywords', 'left_video_keywords', 'right_video_keywords',
    'search_layers',
  ];

  function _stripLegacyFields(scene) {
    LEGACY_FIELDS.forEach(k => { delete scene[k]; });
  }

  function _firstSentence(text) {
    if (!text) return '';
    const m = String(text).trim().match(/^[^.!?。]+[.!?。]?/);
    return m ? m[0].trim() : String(text).trim();
  }

  // 특정 타입이 렌더링 가능한 상태인지 — 필수 필드 검증
  function _hasRequiredFields(scene) {
    switch (scene.type) {
      case 'barchart':
        return Array.isArray(scene.values) && scene.values.length > 0
            && Array.isArray(scene.labels) && scene.labels.length > 0;
      case 'rankingBoard':
        return Array.isArray(scene.cards) && scene.cards.length > 0;
      case 'iconGrid':
        return Array.isArray(scene.tiles) && scene.tiles.length > 0;
      case 'conceptExplainer':
        return !!(scene.term || scene.definition);
      case 'comparison':
        return !!(scene.left_text || scene.right_text);
      case 'infographic':
        // steps 있거나 imageUrl 있으면 OK
        return (Array.isArray(scene.steps) && scene.steps.length > 0) || !!scene.imageUrl;
      case 'stat':
        return scene.number != null && scene.number !== '';
      case 'quote':
        return !!(scene.quote_text || scene.narration);
      case 'keypoint':
      case 'title_card':
        // narration 만 있어도 렌더링 가능 (keypoint 는 narration-only 모드로)
        return !!scene.narration;
      default:
        return false;
    }
  }

  function _autoPopulate(scene) {
    const narration = (scene.narration || '').trim();
    const first = _firstSentence(narration);

    if (scene.type === 'title_card') {
      if (!scene.title_main) scene.title_main = first || narration.slice(0, 60);
    } else if (scene.type === 'keypoint') {
      // highlight_text 미제공 → narration-only 모드로 전환 (비주얼은 아이콘만, 자막이 텍스트 담당)
      if (!scene.highlight_text || !scene.highlight_text.trim()) {
        scene._narrationOnly = true;
      } else {
        delete scene._narrationOnly;
      }
    } else if (scene.type === 'quote') {
      if (!scene.quote_text && narration) scene.quote_text = narration;
    } else if (scene.type === 'stat') {
      // number 추출 시도
      if (scene.number == null || scene.number === '') {
        const m = narration.match(/(\d+(?:[.,]\d+)?)\s*([가-힣%원개건명분시일초년]+)?/);
        if (m) {
          scene.number = m[1];
          if (m[2] && !scene.unit) scene.unit = m[2];
          if (!scene.context) scene.context = narration.replace(m[0], '').trim().slice(0, 60);
        }
      }
    }
  }

  // 타입 유효성 검증 → 필드 부족하면 keypoint 로 강등
  function _degradeIfUnrenderable(scene, idx, total) {
    if (scene.type === 'title_card') return;  // title_card 는 narration 만으로도 OK
    if (_hasRequiredFields(scene)) return;    // 필수 필드 있음 → 유지

    // infographic: steps 없고 imageUrl 없음 → 이미지 생성 대기 상태로 남겨두되
    // 재생 시 keypoint-narration 모드로 폴백 (VISUAL PENDING 대신)
    if (scene.type === 'infographic') {
      scene._pendingImage = true;
    }

    // 나머지: keypoint 로 강등
    const isEdge = (idx === 0 || idx === total - 1);
    scene.type = isEdge ? 'title_card' : 'keypoint';
    _autoPopulate(scene);
  }

  function normalize(scene, idx, total) {
    if (!scene || typeof scene !== 'object') return scene;

    // 1. 레거시 필드 제거
    _stripLegacyFields(scene);

    // 2. 레거시 타입 매핑
    if (scene.type && LEGACY_TYPE_MAP[scene.type]) {
      scene.type = LEGACY_TYPE_MAP[scene.type];
    }

    // 3. 미지원 타입 → 기본값
    if (!scene.type || !VALID_TYPES.includes(scene.type)) {
      scene.type = (idx === 0 || idx === total - 1) ? 'title_card' : 'keypoint';
    }

    // 4. 씬 번호 보정
    if (!scene.scene) scene.scene = idx + 1;

    // 5. 타입별 필수 필드 검증 + 자동 강등
    _degradeIfUnrenderable(scene, idx, total);

    // 6. 자동 필드 보충 (narration → highlight_text/title_main 등)
    _autoPopulate(scene);

    return scene;
  }

  function normalizeScript(scenes) {
    if (!Array.isArray(scenes)) return scenes;
    const total = scenes.length;
    scenes.forEach((scene, idx) => normalize(scene, idx, total));
    return scenes;
  }

  window.SceneNormalizer = {
    normalize,
    normalizeScript,
    VALID_TYPES: VALID_TYPES.slice(),
    LEGACY_TYPE_MAP: Object.assign({}, LEGACY_TYPE_MAP),
  };
})();
