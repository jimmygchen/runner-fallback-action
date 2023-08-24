const core = require('@actions/core');
const httpClient = require('@actions/http-client');

async function checkRunner({ token, owner, repo, primaryRunnerLabels, fallbackRunner }) {
  const http = new httpClient.HttpClient('http-client', [new httpClient.BearerCredentialHandler(token)]);
  const response = await http.getJson(`https://api.github.com/repos/${owner}/${repo}/actions/runners`);

  if (response.statusCode !== 200) {
    return { error: `Failed to get runners. Status code: ${response.statusCode}` };
  }

  const runners = response.result.runners || [];
  let useRunner = fallbackRunner;
  let primaryIsOnline = false;

  for (const runner of runners) {
    if (runner.status === 'online') {
      const runnerLabels = runner.labels.map(label => label.name);
      if (primaryRunnerLabels.every(label => runnerLabels.includes(label))) {
        primaryIsOnline = true;
        useRunner = primaryRunnerLabels.join(',');
        break;
      }
    }
  }

  return { useRunner, primaryIsOnline };
}

async function main() {
  try {
    const inputs = {
      token: core.getInput('github-token', { required: true }),
      owner: core.getInput('owner', { required: true }),
      repo: core.getInput('repo', { required: true }),
      primaryRunnerLabels: core.getInput('primary-runner', { required: true }).split(','),
      fallbackRunner: core.getInput('fallback-runner', { required: true }),
    };

    const { useRunner, primaryIsOnline, error } = await checkRunner(inputs);

    if (error) {
      core.setFailed(error);
      return;
    }

    core.info(`Primary runner is online: ${primaryIsOnline}`);
    core.info(`Using runner: ${useRunner}`);

    core.setOutput('use-runner', useRunner);
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = { checkRunner };

if (require.main === module) {
  main();
}
