const path = require('path');
const { exec } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');

const args = process.argv.slice(2);
const sequenceArg = args.find((arg) => arg.startsWith('--sequence='));
const durationArg = args.find((arg) => arg.startsWith('--duration='));
const duration = durationArg ? parseInt(durationArg.split('=')[1]) : 30;
const sequence = sequenceArg ? sequenceArg.split('=')[1].split(',') : null;

const VOICE_ACTIONS = {
  swipeNext: { fileName: 'swipe-next.mp3', duration: 5000, emoji: '👇' },
  swipePrevious: {
    fileName: 'swipe-previous.mp3',
    duration: 5000,
    minInterval: 4,
    maxInterval: 7,
    emoji: '👆',
  },
  likePost: {
    fileName: 'like-post.mp3',
    duration: 1500,
    minInterval: 4,
    maxInterval: 7,
    emoji: '❤️',
  },
  savePost: {
    fileName: 'save-post.mp3', duration: 5000, minInterval: 4, maxInterval: 7, emoji: '💾',
  },
  openComments: {
    fileName: 'open-comments.mp3', duration: 7000, minInterval: 4, maxInterval: 7, emoji: '💬',
  },
  openProfile: {
    fileName: 'open-profile.mp3', duration: 7000, minInterval: 10, maxInterval: 15, emoji: '👤',
  },
  openShop: {
    fileName: 'open-shop.mp3', duration: 15000, minInterval: 30, maxInterval: 35, emoji: '🛍️',
  },
  openInbox: {
    fileName: 'open-inbox.mp3', duration: 15000, minInterval: 30, maxInterval: 35, emoji: '📥',
  },
};

const TOTAL_SESSION_MS = duration * 60 * 1000;
const VOICE_DIR = path.join(__dirname, 'voice-actions');

const wait = (ms) => new Promise((res) => setTimeout(res, ms));
const play = (filePath) =>
  new Promise((resolve) => exec(`afplay "${filePath}"`, () => resolve()));
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateThresholds = (swipeCount) => {
  const thresholds = {};
  for (const [key, action] of Object.entries(VOICE_ACTIONS)) {
    if (action.minInterval && action.maxInterval) {
      thresholds[key] =
        swipeCount + random(action.minInterval, action.maxInterval);
    }
  }
  return thresholds;
};

const stats = {
  swipeNext: 0,
  likePost: 0,
  swipePrevious: 0,
};

const renderTable = () => {
  const table = new Table({
    head: [chalk.bold('Action'), 'Count'],
    colWidths: [20, 10],
  });

  for (const [actionKey, count] of Object.entries(stats)) {
    const emoji = VOICE_ACTIONS[actionKey]?.emoji || '';
    table.push([`${emoji} ${chalk.cyan(actionKey)}`, chalk.green(count)]);
  }

  console.log(table.toString());
};

const perform = async (actionKey, swipeCount, spinner) => {
  const action = VOICE_ACTIONS[actionKey];
  stats[actionKey] += 1;

  spinner.stop();
  console.log(
    `${chalk.gray(`[${new Date().toLocaleTimeString()}]`)} ${chalk.yellow(
      action.emoji,
    )} ${chalk.bold(actionKey.toUpperCase())} ${chalk.gray(
      `(Swipe #${swipeCount})`,
    )}`,
  );

  play(path.join(VOICE_DIR, action.fileName));
  const totalWait = action.duration + random(1000, 4000);

  let elapsed = 0;
  spinner.text = `${chalk.blue(
    '⏱',
  )} ${new Date().toLocaleTimeString()} | ${chalk.gray(
    'Swipes:',
  )} ${chalk.green(swipeCount)} | ${chalk.gray('Pause')} ${chalk.yellow(
    `${totalWait}ms`,
  )}`;
  spinner.start();

  while (elapsed < totalWait) {
    await wait(100);
    elapsed += 100;
  }

  spinner.stop();
};

const runWarmup = async () => {
  console.clear();
  console.log(chalk.magenta.bold('\n♨️ TIKTOK WARMUP BOT'));
  console.log(chalk.gray('────────────────────────────────────────────\n'));

  const start = Date.now();
  let swipeCount = 0;
  let thresholds = generateThresholds(swipeCount);

  const spinner = ora({
    text: chalk.gray('Warming up...'),
    spinner: 'dots',
  }).start();

  while (Date.now() - start < TOTAL_SESSION_MS) {
    swipeCount++;
    spinner.text = `${chalk.blue(
      '⏱',
    )} ${new Date().toLocaleTimeString()} | ${chalk.gray(
      'Swipes:',
    )} ${chalk.green(swipeCount)}`;

    await perform('swipeNext', swipeCount, spinner);

    let didAction = false;
    for (const [actionKey, threshold] of Object.entries(thresholds)) {
      if (swipeCount === threshold && !didAction) {
        await perform(actionKey, swipeCount, spinner);
        thresholds = generateThresholds(swipeCount);
        didAction = true;
      }
    }
  }

  spinner.stop();
  console.log(chalk.green.bold('\n✅ Warmup session complete!\n'));
  renderTable();
};

const runSequence = async (sequence) => {
  console.clear();
  console.log(chalk.magenta.bold('\n♨️ TIKTOK WARMUP BOT (CUSTOM SEQUENCE)'));
  console.log(chalk.gray('────────────────────────────────────────────\n'));

  const spinner = ora().start();
  let swipeCount = 0;

  for (const actionKey of sequence) {
    swipeCount++;
    if (!VOICE_ACTIONS[actionKey]) {
      console.log(chalk.red(`Unknown action: ${actionKey}`));
      continue;
    }
    await perform(actionKey, swipeCount, spinner);
  }

  spinner.stop();
  console.log(chalk.green.bold('\n✅ Custom sequence complete!\n'));
  renderTable();
};

if (sequence) {
  runSequence(sequence);
} else {
  runWarmup();
}
