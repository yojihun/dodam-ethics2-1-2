# 🔊 정적 TTS 오디오 생성 가이드 (Audio Generation Guide)

이 프로젝트는 브라우저 내장 Web Speech API의 억양 불안정성, 모바일 호환성 한계, 다국어 깨짐 현상을 근본적으로 해결하기 위해 **빌드 타임 사전 생성(Pre-generation) 정적 MP3 오디오 오프라인 재생 방식**을 사용합니다.

과목을 변경하거나 텍스트 데이터를 수정했을 때 TTS 파일을 일괄 재생성하는 절차를 정리했습니다.

---

## 1. 정적 오디오 연동 원리

1. **텍스트 해싱 (MD5)**: 
   - 재생할 한국어 문장(예: `"정답은 빗살무늬 토기입니다."`)의 공백 및 문장 부호를 정리한 뒤 순수 텍스트의 MD5 해시값을 생성합니다.
   - 해시 문자열을 파일명으로 하는 MP3 파일을 매칭합니다 (예: `fbc64d09942dd085ccab9584817bf9a7.mp3`).
   - 해시 매핑 덕분에 데이터베이스에 오디오 파일명을 별도로 저장하지 않고도 100% 동적 매칭 재생이 가능합니다.
2. **오디오 파일 재생 (`src/utils/audio.js`)**:
   - 브라우저 JS 단에서 텍스트의 MD5 해시를 구한 뒤, `/audio/[MD5].mp3` 주소를 `new Audio()` 객체로 로드하여 즉각 재생합니다.

---

## 2. TTS 생성 유틸리티 소스코드 (`generate_audio.py`)

로컬 환경에서 이 스크립트를 한 번만 실행하면 교과서 데이터(`chapters.js`)에 기록된 모든 핵심 용어와 정의, 안내 멘트용 텍스트를 파싱하여 `public/audio/` 폴더에 MP3 파일로 변환 저장해 줍니다.

```python
import os
import re
import hashlib
import json
from gtts import gTTS

# 설정 상수 정의
JSON_DATA_PATH = "../src/data/chapters.js"
OUTPUT_DIR = "../public/audio"

def get_md5_hash(text):
    """텍스트의 MD5 해시값을 구해 파일명으로 사용합니다."""
    return hashlib.md5(text.encode('utf-8')).hexdigest()

def clean_text(text):
    """불필요한 대괄호나 특수문자를 제거해 정밀한 TTS 발음을 얻습니다."""
    text = re.sub(r'\[(.*?)\]', r'\1', text)
    return text.strip()

def generate_mp3(text, lang='ko'):
    """gTTS API를 호출해 MP3 음성을 다운로드합니다."""
    clean = clean_text(text)
    if not clean:
        return
    
    file_hash = get_md5_hash(clean)
    output_path = os.path.join(OUTPUT_DIR, f"{file_hash}.mp3")
    
    # 이미 생성된 파일이 있다면 불필요한 API 호출을 건너뜁니다.
    if os.path.exists(output_path):
        return
        
    print(f"변환 중: '{clean}' -> {file_hash}.mp3")
    try:
        tts = gTTS(text=clean, lang=lang, slow=False)
        tts.save(output_path)
    except Exception as e:
        print(f"에러 발생: {e}")

def parse_chapters():
    """chapters.js 파일에서 TTS 대상 텍스트들을 전부 추출합니다."""
    if not os.path.exists(JSON_DATA_PATH):
        print("에러: chapters.js 파일을 찾을 수 없습니다.")
        return []

    with open(JSON_DATA_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # JS 코드 내부의 JSON 배열 데이터를 정규식으로 파싱하여 추출합니다.
    json_match = re.search(r'export\s+const\s+chapters\s*=\s*(\[[\s\S]*?\]);', content)
    if not json_match:
        print("에러: chapters 변수를 찾지 못했습니다.")
        return []

    try:
        chapters_data = json.loads(json_match.group(1))
    except json.JSONDecodeError as e:
        print(f"JSON 파싱 실패: {e}")
        return []

    texts_to_speech = set()
    
    for chapter in chapters_data:
        for section in chapter.get("sections", []):
            for sub in section.get("subsections", []):
                # 1) 역사 카드 모드의 용어 정의 TTS 등록
                for card in sub.get("flashcards", []):
                    # 용어 정의 문장
                    texts_to_speech.add(card["definition"])
                    # 정답 확인 리드백 멘트
                    texts_to_speech.add(f"정답은 {card['term']}입니다.")
                    
    return list(texts_to_speech)

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("교과서 텍스트 데이터 파싱을 시작합니다...")
    tts_list = parse_chapters()
    
    print(f"총 {len(tts_list)}개의 음성 텍스트를 변환합니다.")
    for idx, text in enumerate(tts_list):
        generate_mp3(text)
        
    print("🎉 모든 TTS 오디오 파일 생성 완료!")

if __name__ == "__main__":
    main()
```

---

## 3. 실행 방법 (Python 환경 설정)

로컬 머신에 파이썬이 설치되어 있을 경우 터미널에서 다음 명령어를 순서대로 실행합니다:

```bash
# 1) gTTS 라이브러리 설치
pip install gTTS

# 2) 프로젝트 scratch 폴더 내의 스크립트 실행
python scratch/generate_audio.py
```

- 스크립트가 실행되면 교과서 내용 중 TTS 재생이 필요한 용어 정의와 답안 리드백 문장들을 검출한 뒤, 기존 파일과 겹치지 않는 새 에셋들만 Google Translate TTS API를 호출해 다운로드합니다.
- 새로 다운로드된 오디오 파일들은 Git에 커밋하여 소스코드와 함께 Vercel에 Push하면 원격 배포 버전에서도 문제없이 재생됩니다.
