# Github Runner Fallback Action

<p align="center">
  <a href="https://github.com/jimmygchen/runner-fallback-action/actions"><img alt="javscript-action status" src="https://github.com/jimmygchen/runner-fallback-action/workflows/units-test/badge.svg"></a>
</p>

Github action to determine the availability of self-hosted runners, and fallback to a GitHub runner if the primary runners are offline.

## Usage

```yaml
jobs:
  determine_runner:
    runs-on: ubuntu-latest
    outputs:
      runner: ${{ steps.set_runner.outputs.use-runner }}
    steps:
      - name: Determine which runner to use
        id: set_runner
        uses: runner-fallback-action@v1
        with:
          primary-runner: "self-hosted,linux"
          fallback-runner: "ubuntu-latest"

  another_job:
    needs: determine_runner
    runs-on: ${{ needs.determine_runner.outputs.runner }}
    steps:
      - name: Do something
        run: echo "Doing something on ${{ needs.determine_runner.outputs.runner }}"
```
