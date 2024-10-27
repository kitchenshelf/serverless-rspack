import type Serverless from 'serverless';
import { Logging } from 'serverless/classes/Plugin.js';
import type Service from 'serverless/classes/Service';

export const logger: Logging = {
  log: {
    error: jest.fn(),
    warning: jest.fn(),
    notice: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    success: jest.fn(),
  },
  writeText: jest.fn(),
  progress: {
    get: jest.fn(),
    create: jest.fn(),
  },
};

export const mockProvider: Service['provider'] = {
  name: 'aws',
  region: 'eu-west-1',
  stage: 'dev',
  runtime: 'nodejs20.x',
  compiledCloudFormationTemplate: {
    Resources: {},
  },
  versionFunctions: true,
};

export const functions: Service['functions'] = {
  hello1: {
    handler: 'hello1.handler',
    events: [],
    package: { artifact: 'hello1' },
  },
  hello2: {
    handler: 'hello2.handler',
    events: [],
    package: { artifact: 'hello2' },
  },
};

export const packageIndividuallyService: () => Partial<Service> = () => ({
  functions: functions,
  package: { individually: true },
  provider: mockProvider,
  getFunction: (name) => functions[name],
  getAllFunctions: jest.fn().mockReturnValue(Object.keys(functions)),
});

export const mockServerlessConfig = (
  serviceOverride?: Partial<Service>
): Serverless => {
  const service = {
    ...packageIndividuallyService(),
    ...serviceOverride,
  } as Service;

  const mockCli = {
    log: jest.fn(),
  };

  return {
    service,
    config: {
      servicePath: '/workDir',
      serviceDir: '/workDir',
    },
    configSchemaHandler: {
      defineCustomProperties: jest.fn(),
      defineFunctionEvent: jest.fn(),
      defineFunctionEventProperties: jest.fn(),
      defineFunctionProperties: jest.fn(),
      defineProvider: jest.fn(),
      defineTopLevelProperty: jest.fn(),
    },
    cli: mockCli,
    utils: {
      fileExistsSync: jest.fn(),
    } as any,
    classes: {
      Error: jest.fn() as any,
    },
  } as Partial<Serverless> as Serverless;
};

export const mockOptions: Serverless.Options = {
  region: 'eu-east-1',
  stage: 'dev',
};
