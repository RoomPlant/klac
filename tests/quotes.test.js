const { test } = require("node:test");
const assert = require("node:assert/strict");
const { flamingo, batman, dialogues, createPicker } = require("../quotes");

test("all forty lines and six ordered exchanges are present", () => {
  assert.equal(flamingo.length, 20);
  assert.equal(batman.length, 20);
  assert.equal(new Set([...flamingo, ...batman]).size, 40);
  assert.equal(dialogues.length, 6);
  for (const pair of dialogues) {
    assert.equal(pair.length, 2);
    assert.deepEqual(new Set(pair.map((line) => line.speaker)), new Set(["batman", "flamingo"]));
  }
});

test("single lines are shuffled without repeats until all forty have appeared", () => {
  const pick = createPicker(() => 0.5);
  const lines = Array.from({ length: 40 }, () => pick());
  assert.ok(lines.every((line) => line.length === 1));
  assert.equal(new Set(lines.map(([line]) => line.text)).size, 40);
  assert.deepEqual(new Set(lines.map(([line]) => line.text)), new Set([...flamingo, ...batman]));
  assert.equal(pick().length, 1, "pool refills");
});

test("rare branch selects all six exchanges without repeats and preserves order", () => {
  const pick = createPicker(() => 0.01);
  const pairs = Array.from({ length: 6 }, () => pick());
  assert.equal(new Set(pairs.map(JSON.stringify)).size, 6);
  for (const pair of pairs) assert.ok(dialogues.some((d) => JSON.stringify(d) === JSON.stringify(pair)));
  assert.equal(pick().length, 2);
});

test("dialogues have a twelve percent selection threshold", () => {
  assert.equal(createPicker(() => 0.119)().length, 2);
  assert.equal(createPicker(() => 0.12)().length, 1);
});
