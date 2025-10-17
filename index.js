const core = require('@actions/core');
const httpClient = require('@actions/http-client');

async function checkRunner({
  token,
  primaryRunnerLabels,
  fallbackRunner,
  primariesRequired,
  apiPath,
}) {
  const http = new httpClient.HttpClient("http-client");
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const response = await http.getJson(
    `https://api.github.com/${apiPath}`,
    headers
  );

  if (response.statusCode !== 200) {
    return {
      error: `Failed to get runners. Status code: ${response.statusCode}`,
    };
  }

  const runners = response.result.runners || [];
  let useRunner = fallbackRunner;
  let primaryIsOnline = false;
  let sufficientPrimaries = false;
  let primariesAvailableCount = 0;

  for (const runner of runners) {
    if (runner.status === "online") {
      const runnerLabels = runner.labels.map((label) => label.name);
      if (primaryRunnerLabels.every((label) => runnerLabels.includes(label))) {
        primaryIsOnline = true;

        // Is the number of primaries important? If so, keep track of them
        if (primariesRequired !== undefined) {
          // if we need more primaries and this one is busy, keep looking
          if (runner.busy === true) {
           continue;
          }

          // if we still do not have enough primaries, keep looking
          primariesAvailableCount++;
          if (primariesAvailableCount < primariesRequired) {
            continue;
          }
        }

        sufficientPrimaries = true;
        useRunner = primaryRunnerLabels.join(",");
        break;
      }
    }
  }

  // return a JSON string so that it can be parsed using `fromJson`, e.g. fromJson('["self-hosted", "linux"]')
  return { useRunner: JSON.stringify(useRunner.split(",")), primaryIsOnline, sufficientPrimaries };
}

async function main() {
  const githubRepository = process.env.GITHUB_REPOSITORY;
  const organization = core.getInput('organization', { required: false });
  const enterprise = core.getInput('enterprise', { required: false });
  const [owner, repo] = githubRepository.split("/");
  if (organization && enterprise) {
    throw new Error('You cannot specify both organization and enterprise inputs. Please choose one.');
  }
  let apiPath = `repos/${owner}/${repo}/actions/runners`;
  if (organization) {
    apiPath = `orgs/${organization}/actions/runners`;
  } else if (enterprise) {
    apiPath = `enterprises/${enterprise}/actions/runners`;
  }


  try {
    const inputs = {
      apiPath,
      token: core.getInput('github-token', { required: true }),
      primaryRunnerLabels: core.getInput('primary-runner', { required: true }).split(','),
      fallbackRunner: core.getInput('fallback-runner', { required: true }),
      primariesRequired: core.getInput('primaries-required', { required: false }),
    };

    const { useRunner, primaryIsOnline, sufficientPrimaries, error } = await checkRunner(inputs);

    if (error) {
      core.setFailed(error);
      return;
    }

    core.info(`Primary runner is online: ${primaryIsOnline}`);
    core.info(`Sufficient primary runners available: ${sufficientPrimaries}`);
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
