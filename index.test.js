const { checkRunner } = require('./index');
const mockGetJson = jest.fn();

jest.mock('@actions/http-client', () => {
  return {
    HttpClient: jest.fn().mockImplementation(() => {
      return {
        getJson: mockGetJson,
      };
    }),
    BearerCredentialHandler: jest.fn(),
  };
});

describe('checkRunner', () => {
  it('should use the primary runner if it is online', async () => {
    mockGetJson.mockResolvedValue({
      statusCode: 200,
      result: {
        runners: [
          {
            status: 'online',
            labels: [
              { name: 'self-hosted' },
              { name: 'linux' },
            ],
          },
        ],
      },
    });

    const result = await checkRunner({
      token: 'fake-token',
      owner: 'fake-owner',
      repo: 'fake-repo',
      primaryRunnerLabels: ['self-hosted', 'linux'],
      fallbackRunner: 'ubuntu-latest',
    });

    expect(result).toEqual({
      useRunner: 'self-hosted,linux',
      primaryIsOnline: true,
    });
  });

  it('should use the fallback runner if the primary is not online', async () => {
    mockGetJson.mockResolvedValue({
      statusCode: 200,
      result: {
        runners: [
          {
            status: 'offline',
            labels: [
              { name: 'self-hosted' },
              { name: 'linux' },
            ],
          },
        ],
      },
    });

    const result = await checkRunner({
      token: 'fake-token',
      owner: 'fake-owner',
      repo: 'fake-repo',
      primaryRunnerLabels: ['self-hosted', 'linux'],
      fallbackRunner: 'ubuntu-latest',
    });

    expect(result).toEqual({
      useRunner: 'ubuntu-latest',
      primaryIsOnline: false,
    });
  });
});
