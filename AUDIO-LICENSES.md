# Qolmen — источники звуков

Звуки хранятся вместе с сайтом. Видео камеры не передаётся источникам сэмплов.

## Пианино, акустическая гитара, электрогитара

FluidR3_GM SoundFont, Frank Wen и участники проекта; предварительный рендер нот — Gleitz / MIDI.js Soundfonts.

- Источник и заявление лицензии: https://github.com/gleitz/midi-js-soundfonts/blob/gh-pages/README.md
- Лицензия: Creative Commons Attribution 3.0 United States: https://creativecommons.org/licenses/by/3.0/us/
- Файлы: acoustic_grand_piano-mp3.js, acoustic_guitar_steel-mp3.js, electric_guitar_clean-mp3.js из https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/
- Изменения: выбраны ноты MIDI 36–96 через тон, аудиоданные упакованы в bank-piano.json, bank-guitar.json и bank-electric.json. Между записанными нотами используется изменение скорости воспроизведения. Аккорды и порядок струн задаются кодом Qolmen.

## Укулеле

FreePats Ukulele 1, библиотека https://github.com/freepats/ukulele1 .

- Источник: https://freepats.zenvoid.org/GuitarFamily/ukulele.html
- CC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/
- Исходная лицензия: https://github.com/freepats/ukulele1/blob/main/LICENSE.txt
- Изменения: 13 высот C4–C6 преобразованы из FLAC в MP3 96 kbps, ограничены шестью секундами и упакованы в bank-ukulele.json. Для промежуточных высот меняется скорость воспроизведения.

Тестовые записи Online Sequencer не включены в публичный сайт. Это другая библиотека инструментов, поэтому её тембр отличается от тестового Grand Piano Online Sequencer.
