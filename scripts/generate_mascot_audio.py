import argparse
import os
from pathlib import Path

import requests

VOICE_MAP = {
    "king": "pNInz6obpgDQGcFmaJgB",
    "general": "SOYHLrjzK2X1ezoPC6cr",
    "scholar": "dMZ8mX0Ph1cjrCK7Jhrg",
}

LINES = {
    "king_s1": ("king", "학업의 근간이 튼튼하구나! 훌륭하다."),
    "king_s2": ("king", "경의 학식 정진이 내 마음을 매우 흡족하게 하는구려!"),
    "king_s3": ("king", "바른 지식을 깨우치는 모습이 참으로 아름답도다."),
    "king_f1": ("king", "아직 정밀함이 부족하오. 힘내시게!"),
    "king_f2": ("king", "과거 시험의 길은 험난한 법, 다시 분발하여 답을 찾아보시게."),
    "king_h1": ("king", "힌트를 찬찬히 읽어 지혜를 보태어 보시오."),
    "general_s1": ("general", "정답일세! 기세가 조조와 같구려!"),
    "general_s2": ("general", "학문의 바다를 돌파하는 기세가 거침이 없구나! 승전이로다!"),
    "general_s3": ("general", "좋은 흐름이다! 이 기세를 몰아 다음 장벽도 깨부수자!"),
    "general_f1": ("general", "아직 포기하긴 이르다! 전열을 가다듬고 다시 돌격하라!"),
    "general_f2": ("general", "아깝구나. 패배에 흔들리지 말고 문제를 다시 분석해 보아라."),
    "general_h1": ("general", "여기에 힌트를 준비했으니, 지략을 새로 짜 보아라!"),
    "scholar_s1": ("scholar", "문장이 유려하고 논리가 바르오!"),
    "scholar_s2": ("scholar", "경전의 이치를 꿰뚫어 보았구려. 참으로 탁월한 학식이오."),
    "scholar_s3": ("scholar", "정답의 이치가 명명백백하니 내 마음이 밝아지는구려."),
    "scholar_f1": ("scholar", "개념이 일부 누락되었구려. 피드백을 보시오."),
    "scholar_f2": ("scholar", "아깝소. 다시 차분하게 복기해 보시오."),
    "scholar_h1": ("scholar", "학문에 지름길은 없으나, 여기 힌트가 길잡이가 되어줄 것이오."),
}


def generate_line(api_key: str, line_id: str, role: str, text: str, output_dir: Path) -> None:
    voice_id = VOICE_MAP[role]
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.75,
            "similarity_boost": 0.75,
        },
    }
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
    }

    response = requests.post(url, headers=headers, json=payload, timeout=120)
    response.raise_for_status()

    output_dir.mkdir(parents=True, exist_ok=True)
    destination = output_dir / f"{line_id}.mp3"
    destination.write_bytes(response.content)
    print(f"Saved {destination}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate mascot audio with ElevenLabs.")
    parser.add_argument(
        "--output",
        default="public/audio",
        help="Directory where generated mp3 files will be written.",
    )
    args = parser.parse_args()

    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise SystemExit("ELEVENLABS_API_KEY is required.")

    output_dir = Path(args.output)

    for line_id, (role, text) in LINES.items():
        generate_line(api_key, line_id, role, text, output_dir)


if __name__ == "__main__":
    main()
