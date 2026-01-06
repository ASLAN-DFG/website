const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'datasets.json');
const datasets = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

module.exports = {
  data: datasets,
  keys: Object.keys(datasets[0])
};