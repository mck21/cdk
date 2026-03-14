import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an API Gateway REST API
    const api = new cdk.aws_apigateway.CfnRestApi(this, 'MyApi', {
      name: 'MyApi',
      description: 'A simple API Gateway REST API',
    });

    // Create a resource and method for the API
    const resource = new cdk.aws_apigateway.CfnResource(this, 'MyResource', {
      parentId: api.attrRootResourceId,
      pathPart: 'myresource',
      restApiId: api.ref,
    });

    const method = new cdk.aws_apigateway.CfnMethod(this, 'MyMethod', {
      httpMethod: 'GET',
      resourceId: resource.ref,
      restApiId: api.ref,
      authorizationType: 'NONE',
      integration: {
        type: 'MOCK',
        requestTemplates: {
          'application/json': '{"statusCode": 200}',
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': '{"message": "Hello, World!"}',
            },
          },
        ],
      },
      methodResponses: [
        {
          statusCode: '200',
        },
      ],
    });

    // Deploy the API
    const deployment = new cdk.aws_apigateway.CfnDeployment(this, 'MyDeployment', {
      restApiId: api.ref,
    });
    deployment.addDependency(method);

    // Add a deployment stage for the API
    const stage = new cdk.aws_apigateway.CfnStage(this, 'MyStage', {
      deploymentId: deployment.ref,
      restApiId: api.ref,
      stageName: 'prod',
    });

    // Role for the Lambda function (required by CfnFunction)
    const lambdaRole = new cdk.aws_iam.CfnRole(this, 'HelloLambdaRole', {
      assumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { Service: 'lambda.amazonaws.com' },
            Action: 'sts:AssumeRole',
          },
        ],
      },
      managedPolicyArns: [
        'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
      ],
    });

    // Lambda function using L1 CfnFunction calling the API Gateway endpoint
    const helloLambda = new cdk.aws_lambda.CfnFunction(this, 'HelloLambda', {
      runtime: 'nodejs18.x',
      handler: 'index.handler',
      role: lambdaRole.attrArn,
      code: {
        zipFile: `
          const https = require('https');
          exports.handler = async function(event) {
            const url = process.env.API_URL;
            return new Promise((resolve, reject) => {
              https.get(url, res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ statusCode: 200, body: data }));
              }).on('error', reject);
            });
          };
        `,
      },
      environment: {
        variables: {
          API_URL: `https://${api.ref}.execute-api.${this.region}.amazonaws.com/${stage.stageName}/myresource`,
        },
      },
    });

    // Output the API endpoint URL
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      description: 'The URL of the API Gateway endpoint: ',
      value: `https://${api.ref}.execute-api.${this.region}.amazonaws.com/${stage.stageName}/myresource`,
    });
  }
}
