# Github Runner Fallback Action

<p align="center">
  <a href="https://github.com/jimmygchen/runner-fallback-action/actions"><img alt="javscript-action status" src="https://github.com/jimmygchen/runner-fallback-action/workflows/units-test/badge.svg"></a>
</p>

Github action to determine the availability of self-hosted runners, and fallback to a GitHub runner if the primary runners are offline.

This action uses [GitHub API](https://docs.github.com/en/rest/actions/self-hosted-runners?apiVersion=2022-11-28#list-self-hosted-runners-for-a-repository) to check the statuses of self hosted-runners that match specific labels, and outputs the runner label(s), or a fallback runner if the self-hosted runner(s) is unavailable.

The API used requires an access token with org admin rights, for example a classic Personal Access Token with org:admin scope selected.

This output can then used on the `runs-on` property of subsequent jobs. 

Note: In order to support an array of labels for the `runs-on` field, the output is formatted as a JSON string and needs to be parsed using `fromJson`. See example usage below.



## Usage

### ✏️ Inputs

#### Required

|       Name        |                                          Description                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
|  `github-token`   | A token that can access the `list action runners` for the given context (e.g. user repo, org, enterprise). |
|  `primary-runner` | A comma separated list of labels for the _primary_ runner (e.g. 'self-hosted,linux').                      |
| `fallback-runner` | A comma separated list of labels for the _fallback_ runner (e.g. 'self-hosted,linux').                     |


#### Optional
---

There are three ways runners can be allowed to run against a repo: User, Organization, Enterprise. The following options allow you to switch the implementation to use one of the other specified levels. **_Note:_** You can only provide one of the values.

|       Name       |                     Description                                    |
| ---------------- | ------------------------------------------------------------------ |
| `organization`   | The name of the github organization (e.g. `My-Github-Org`)         |
| `enterprise`     | The name of the github enterprise (e.g. `My-Github-Ent`)           |

It is possible that you want to use the fallback runners even if the primary runners are online,
if the primary runners are busy. You may optionally configure this action to fallback if there
are not enough free primaries, for example if you are adding self-hosted primaries to increase capacity, but the fallbacks are public runners in a public repo so you don't mind using them as needed.

|       Name           |                     Description                 |
| -------------------- | ----------------------------------------------- |
| `primaries-required` | minimum non-busy primaries count, else fallback |

You may want the action to use the fallback runner, if correctly configured, if there are any
errors at all. This makes it so the action won't block CI runs even if (for example) the
github token is unavailable or expires. Default is false.

|       Name          |                     Description                 |
| ------------------- | ----------------------------------------------- |
| `fallback-on-error` | use the fallback runner if there are any errors |




### Example
```yaml
jobs:
  # Job to 
  determine-runner:
    runs-on: ubuntu-latest
    outputs:
      runner: ${{ steps.set-runner.outputs.use-runner }}
    steps:
      - name: Determine which runner to use
        id: set-runner
        uses: jimmygchen/runner-fallback-action@v1
        with:
          primary-runner: "self-hosted,linux"
          fallback-runner: "ubuntu-latest"
          github-token: ${{ secrets.YOUR_GITHUB_TOKEN }}
          primaries-required: 1
          fallback-on-error: false

  another-job:
    needs: determine-runner
    runs-on: ${{ fromJson(needs.determine-runner.outputs.runner) }}
    steps:
      - name: Do something
        run: echo "Doing something on ${{ needs.determine-runner.outputs.runner }}"
```

Credit: this action is based on the pattern described by @ianpurton on [this feature request thread](https://github.com/orgs/community/discussions/20019#discussioncomment-5414593).
