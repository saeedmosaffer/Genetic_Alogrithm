function generatePasscode(length = 32) {
  return Array.from({ length }, () => (Math.random() < 0.5 ? '0' : '1')).join('');
}

class GeneticAlgorithm {
  constructor(target, populationSize, mutationRate, crossoverRate) {
    this.target = target;
    this.populationSize = populationSize;
    this.mutationRate = mutationRate;
    this.crossoverRate = crossoverRate;
    this.population = [];
    this.generations = 0;
    this.bestGuess = '';
    this.bestFitness = 0;
    this.history = [];
    this.detailedHistory = [];
    this.initPopulation();
  }

  // Initialize the population with random chromosomes
  initPopulation() {
    this.population = Array.from({ length: this.populationSize }, () => generatePasscode(this.target.length));
  }

  // Calculate the fitness of a chromosome (number of matching bits with the target)
  fitness(chromosome) {
    return chromosome.split('').filter((bit, i) => bit === this.target[i]).length;
  }

  // Evolve the population by selection, crossover, and mutation
  evolve() {
    this.generations++;

    // Sort the population by fitness in descending order
    this.population.sort((a, b) => this.fitness(b) - this.fitness(a));

    // Update the best guess and its fitness
    this.bestGuess = this.population[0];
    this.bestFitness = this.fitness(this.bestGuess);

    // Record history
    this.history.push(this.bestFitness);
    this.detailedHistory.push({
      generation: this.generations,
      bestSequence: this.bestGuess,
      fitness: this.bestFitness,
    });

    // If the best fitness matches the target, stop evolution
    if (this.bestFitness === this.target.length) return;

    // Keep the top 2 chromosomes (elite preservation)
    const newPopulation = this.population.slice(0, 2);

    // Create new offspring until the population size is restored
    while (newPopulation.length < this.populationSize) {
      const parent1 = this.tournamentSelection();
      const parent2 = this.tournamentSelection();
      let [child1, child2] = this.crossover(parent1, parent2);
      child1 = this.mutate(child1);
      child2 = this.mutate(child2);
      newPopulation.push(child1, child2);
    }

    // Update the population with the new generation
    this.population = newPopulation.slice(0, this.populationSize);
  }

  // Select a chromosome using tournament selection
  tournamentSelection() {
    const tournament = [
      this.population[Math.floor(Math.random() * this.populationSize)],
      this.population[Math.floor(Math.random() * this.populationSize)],
    ];
    return this.fitness(tournament[0]) > this.fitness(tournament[1]) ? tournament[0] : tournament[1];
  }

  // Perform crossover between two parent chromosomes
  crossover(parent1, parent2) {
    if (Math.random() > this.crossoverRate) return [parent1, parent2];
    const point = Math.floor(Math.random() * parent1.length); // Crossover point
    const child1 = parent1.slice(0, point) + parent2.slice(point);
    const child2 = parent2.slice(0, point) + parent1.slice(point);
    return [child1, child2];
  }

  // Perform mutation on a chromosome
  mutate(chromosome) {
    return chromosome.split('').map(bit => (Math.random() < this.mutationRate ? (bit === '0' ? '1' : '0') : bit)).join('');
  }
}

// Initialize the target passcode and the Genetic Algorithm instance
const target = generatePasscode(); // Generate a random target passcode
const ga = new GeneticAlgorithm(target, 200, 0.01, 0.7);

const targetEl = document.getElementById('target');
const bestGuessEl = document.getElementById('best-guess');
const fitnessEl = document.getElementById('fitness');
const generationsEl = document.getElementById('generations');
const timeEl = document.getElementById('time');
const experimentTableBody = document.getElementById('experiment-table').querySelector('tbody');

targetEl.textContent = target;

// Initialize the chart
const ctx = document.getElementById('convergence-chart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      {
        label: 'Convergence Rate',
        data: [],
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        fill: true,
        tension: 0.3,
      },
    ],
  },
  options: {
    responsive: true,
    scales: {
      x: { title: { display: true, text: 'Generations' } },
      y: { title: { display: true, text: 'Fitness (%)' }, min: 0, max: 100 },
    },
  },
});

// Event listener for the "Start" button
let timer;
document.getElementById('start-btn').addEventListener('click', () => {
  const startTime = Date.now();
  timer = setInterval(() => {
    ga.evolve();
    const timeElapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    // Update the UI with the latest stats
    bestGuessEl.textContent = ga.bestGuess;
    fitnessEl.textContent = `${((ga.bestFitness / target.length) * 100).toFixed(2)}%`;
    generationsEl.textContent = ga.generations;
    timeEl.textContent = `${timeElapsed}s`;

    // Update the chart
    chart.data.labels.push(ga.generations);
    chart.data.datasets[0].data.push((ga.bestFitness / target.length) * 100);
    chart.update();

    // Stop the evolution when the target is matched
    if (ga.bestFitness === target.length) {
      clearInterval(timer);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${ga.populationSize}</td>
        <td>${ga.mutationRate}</td>
        <td>${ga.generations}</td>
        <td>${timeElapsed}s</td>
      `;
      experimentTableBody.appendChild(row);
    }
  }, 50);
});

// Event listener for the "Restart" button
document.getElementById('restart-btn').addEventListener('click', () => {
  clearInterval(timer);
  location.reload();
});

// Event listener for saving the generations data
document.getElementById('save-generations-btn').addEventListener('click', () => {
  if (ga.detailedHistory.length === 0) {
    alert('No generation data to save. Run the algorithm first.');
    return;
  }
  const generationData = ga.detailedHistory
    .map(({ generation, bestSequence, fitness }) =>
      `Generation ${generation}: Best Sequence = ${bestSequence}, Fitness = ${((fitness / target.length) * 100).toFixed(2)}%`
    )
    .join('\n');
  const blob = new Blob([generationData], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'generation_data.txt';
  link.click();
});

// Event listener for applying new configurations
document.getElementById('apply-config').addEventListener('click', () => {
  const populationSize = parseInt(document.getElementById('population-size').value, 10);
  const mutationRate = parseFloat(document.getElementById('mutation-rate').value);
  const crossoverRate = parseFloat(document.getElementById('crossover-rate').value);

  if (
    populationSize > 0 &&
    mutationRate >= 0 &&
    mutationRate <= 1 &&
    crossoverRate >= 0 &&
    crossoverRate <= 1
  ) {
    ga.populationSize = populationSize;
    ga.mutationRate = mutationRate;
    ga.crossoverRate = crossoverRate;
    ga.population = [];
    ga.generations = 0;
    ga.bestGuess = '';
    ga.bestFitness = 0;
    ga.history = [];
    ga.detailedHistory = [];
    ga.initPopulation();

    alert('Configuration applied successfully!');
  } else {
    alert('Invalid configuration values! Please ensure all values are within valid ranges.');
  }
});

// Event listener for saving the chart as an image
document.getElementById('save-chart-btn').addEventListener('click', () => {
  const image = chart.toBase64Image(); // Convert the chart to a Base64 image
  const link = document.createElement('a');
  link.href = image;
  link.download = 'convergence_chart.png';
  link.click();
});
