(function (root) {
  const flamingo = [
    "Тыкай нежнее. Я вообще-то дракон.",
    "Ещё двадцать — и я розовее.",
    "Стою на одной. Работаю за двоих.",
    "Это не перья. Это харизма.",
    "Крылья есть. Планов нет.",
    "Я не завис. Я фламинго.",
    "Клюв занят. Оставьте сообщение.",
    "Ты нажимаешь — я хорошею.",
    "Не нервничаю. Перебираю лапами.",
    "Сегодня я птица высокого полёта. Завтра выходной.",
    "Не трогай шею. Там мысли.",
    "За такие нажатия положены креветки.",
    "Я бы помог, но у меня крылья.",
    "Розовый — это состояние перьев.",
    "Дракон временно без огня.",
    "Мои полномочия всё. Я в пруд.",
    "Не сутулюсь. Экономлю шею.",
    "Кто молодец? Птица молодец.",
    "Ты мне уже как родной палец.",
    "Настроение поднялось. Лапа тоже.",
  ];
  const batman = [
    "Готэм подождёт. Я присел.",
    "Двадцать нажатий. Ни одного по делу.",
    "Я не толстый. Я с запасом сил.",
    "Моя суперсила — не брать трубку.",
    "Костюм розовый. Намерения серьёзные.",
    "Не буди во мне пенсионера.",
    "Расследование идёт. Я пока нет.",
    "Нажал — обними.",
    "Я в форме. Форма свободная.",
    "Злодеи? После обеда.",
    "Плащ есть. Плана нет.",
    "Это не живот. Это отсек для печенья.",
    "Всё под контролем. Просто не моим.",
    "За двадцать кликов полагается компот.",
    "Я спас мир. Ты просто не заметил.",
    "Усы настоящие. Остальное — легенда.",
    "Сигнал видел. Был в тапочках.",
    "Не торопи. Герой загружается.",
    "Опять вызов? Пусть перезвонят.",
    "Настроение найдено. Чек не нужен.",
  ];
  const dialogues = [
    [{ speaker: "batman", text: "Кто тут главный?" }, { speaker: "flamingo", text: "Палец." }],
    [{ speaker: "flamingo", text: "Нас опять нажали." }, { speaker: "batman", text: "Улыбайся. Это работа." }],
    [{ speaker: "batman", text: "Есть зацепка!" }, { speaker: "flamingo", text: "Это ты плащом зацепился." }],
    [{ speaker: "flamingo", text: "Я дракон." }, { speaker: "batman", text: "Тогда разогрей котлету." }],
    [{ speaker: "batman", text: "Пора действовать." }, { speaker: "flamingo", text: "Я только красиво встал." }],
    [{ speaker: "flamingo", text: "Мы популярны!" }, { speaker: "batman", text: "Нас просто легко нажать." }],
  ];

  // Shuffle bags avoid repeats until each pool is exhausted.
  function createPicker(random = Math.random) {
    let singles = [], pairs = [];
    function shuffle(items) {
      const result = items.slice();
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }
    return function pick() {
      if (random() < 0.12) {
        if (!pairs.length) pairs = shuffle(dialogues);
        return pairs.pop().map((line) => ({ ...line }));
      }
      if (!singles.length) singles = shuffle([
        ...flamingo.map((text) => ({ speaker: "flamingo", text })),
        ...batman.map((text) => ({ speaker: "batman", text })),
      ]);
      return [{ ...singles.pop() }];
    };
  }
  const api = { flamingo, batman, dialogues, createPicker };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HeroQuotes = api;
})(typeof window === "undefined" ? globalThis : window);
