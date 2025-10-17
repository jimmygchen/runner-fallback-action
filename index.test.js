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
  beforeEach(() => {
    mockGetJson.mockClear();
  });

  it('should use the primary runner if it is online', async () => {
    mockGetJson.mockResolvedValue({
      statusCode: 200,
      result: {
        runners: [
          {
            status: 'online',
            busy: true,
            labels: [
              { name: 'self-hosted' },
              { name: 'linux' },
            ],
          },
          {
            status: 'online',
            busy: false,
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
      apiPath: 'repos/fake-owner/fake-repo/actions/runners',
      primaryRunnerLabels: ['self-hosted', 'linux'],
      fallbackRunner: 'ubuntu-latest',
      primariesRequired: 1,
    });

    expect(result).toEqual({
      useRunner: '["self-hosted","linux"]',
      primaryIsOnline: true,
      sufficientPrimaries: true,
    });
  });

  it('should use the fallback runner if primaries are online but busy', async () => {
    mockGetJson.mockResolvedValue({
      statusCode: 200,
      result: {
        runners: [
          {
            status: 'online',
            busy: true,
            labels: [
              { name: 'self-hosted' },
              { name: 'linux' },
            ],
          },
          {
            status: 'online',
            busy: true,
            labels: [
              { name: 'self-hosted' },
              { name: 'linux' },
            ],
          },
          {
            status: 'online',
            busy: false,
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
      apiPath: 'repos/fake-owner/fake-repo/actions/runners',
      primaryRunnerLabels: ['self-hosted', 'linux'],
      fallbackRunner: 'ubuntu-latest',
      primariesRequired: 3,
    });

    expect(result).toEqual({
      useRunner: '["ubuntu-latest"]',
      primaryIsOnline: true,
      sufficientPrimaries: false,
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
      apiPath: 'repos/fake-owner/fake-repo/actions/runners',
      primaryRunnerLabels: ['self-hosted', 'linux'],
      fallbackRunner: 'ubuntu-latest',
    });

    expect(result).toEqual({
      useRunner: '["ubuntu-latest"]',
      primaryIsOnline: false,
      sufficientPrimaries: false,
    });
  });

  describe('alternative api handling', () => {
    it('should query organization runners if organization is provided', async () => {
      mockGetJson.mockResolvedValue({
        statusCode: 200,
        result: {
          runners: [],
        },
      });

      await checkRunner({
        token: "fake-token",
        apiPath: 'orgs/call-me-ishmael/actions/runners',
        primaryRunnerLabels: ["self-hosted", "linux"],
        fallbackRunner: "ubuntu-latest",
      });

      expect(mockGetJson).toHaveBeenCalledWith(
        "https://api.github.com/orgs/call-me-ishmael/actions/runners",
        expect.anything()
      );
    });
    it('should query enterprise runners if enterprise is provided', async () => {
      mockGetJson.mockResolvedValue({
        statusCode: 200,
        result: {
          runners: [],
        },
      });

      await checkRunner({
        token: 'fake-token',
        apiPath: 'enterprises/i-am-the-enterprise-now/actions/runners',
        primaryRunnerLabels: ['self-hosted', 'linux'],
        fallbackRunner: 'ubuntu-latest',
      });

      expect(mockGetJson).toHaveBeenCalledWith(
        "https://api.github.com/enterprises/i-am-the-enterprise-now/actions/runners",
        expect.anything()
      );
    });
  });
});
