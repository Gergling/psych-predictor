const scoringCriteria = [
  // Not many days
  () => true,

  // Several days
  days => days > 3,

  // More than half the days
  days => days > 7,

  // Nearly every day
  days => days > 12
];

const getScoreFromCriteria = days => scoringCriteria
  .map((fnc, score) => ({ flag: fnc(days), score }))
  .filter(obj => obj.flag)
  .pop()
  .score;

const generateScoring = totalQuestions => Array
  .from({ length: totalQuestions })
  .map((junk, idx) => (idx + 1) + '. ');

function getScores(data, questions) {
  const scores = generateScoring(questions).reduce((mapping, questionNumber) => {
    const occurrences = (data.match(new RegExp(questionNumber, "gi")) || []).length;
    mapping[questionNumber] = getScoreFromCriteria(occurrences);
    return mapping;
  }, {});
  return scores;
}

const sum = (sum, value) => sum + value;

const getTotal = scores => Object
  .entries(scores)
  .map(entry => entry[1])
  .reduce(sum, 0);

const getOutput = (phq9Data, gad7Data) => {
  return Object
    .entries({
      phq9: getScores(phq9Data, 9),
      gad7: getScores(gad7Data, 7),
    })
    .reduce((obj, entry) => {
      const [name, scores] = entry;
      obj[name] = {
        scores,
        total: getTotal(scores)
      }
      return obj;
    }, {});
};

module.exports = getOutput;
