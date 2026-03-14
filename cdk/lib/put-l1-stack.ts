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

    // Role for the Lambda function
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

    // Lambda function that calls the GET /myresource endpoint
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
          API_URL: `https://${api.ref}.execute-api.${this.region}.amazonaws.com/prod/myresource`,
        },
      },
    });

    // -----------------------------
    // PUT /greet route and Lambda
    // -----------------------------

    const greetResource = new cdk.aws_apigateway.CfnResource(this, 'GreetResource', {
      parentId: api.attrRootResourceId,
      pathPart: 'greet',
      restApiId: api.ref,
    });

    const greetLambdaRole = new cdk.aws_iam.CfnRole(this, 'GreetLambdaRole', {
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

    const greetLambda = new cdk.aws_lambda.CfnFunction(this, 'GreetLambda', {
      runtime: 'nodejs18.x',
      handler: 'index.handler',
      role: greetLambdaRole.attrArn,
      code: {
        zipFile: `
          exports.handler = async function(event) {
            const body = JSON.parse(event.body || '{}');
            const name = body.name || 'World';
            const message = 'Hello, ' + name + '!';
            return { statusCode: 200, body: JSON.stringify({ message }) };
          };
        `,
      },
    });

    // Permission for API Gateway to invoke greet lambda
    new cdk.aws_lambda.CfnPermission(this, 'GreetApiPermission', {
      action: 'lambda:InvokeFunction',
      functionName: greetLambda.ref,
      principal: 'apigateway.amazonaws.com',
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${api.ref}/*/PUT/greet`,
    });

    // PUT method on /greet backed by Lambda proxy
    const putMethod = new cdk.aws_apigateway.CfnMethod(this, 'GreetPutMethod', {
      httpMethod: 'PUT',
      resourceId: greetResource.ref,
      restApiId: api.ref,
      authorizationType: 'NONE',
      integration: {
        type: 'AWS_PROXY',
        integrationHttpMethod: 'POST',
        uri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${greetLambda.attrArn}/invocations`,
      },
    });

    // -----------------------------
    // Deployment — ID lógico único para forzar recreación en cada synth
    // -----------------------------
    const deploymentId = `MyDeployment${Date.now()}`;
    const deployment = new cdk.aws_apigateway.CfnDeployment(this, deploymentId, {
      restApiId: api.ref,
    });
    deployment.addDependency(method);
    deployment.addDependency(putMethod);

    // Stage
    const stage = new cdk.aws_apigateway.CfnStage(this, 'MyStage', {
      deploymentId: deployment.ref,
      restApiId: api.ref,
      stageName: 'prod',
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      description: 'URL of the GET /myresource endpoint',
      value: `https://${api.ref}.execute-api.${this.region}.amazonaws.com/${stage.stageName}/myresource`,
    });
    new cdk.CfnOutput(this, 'GreetEndpoint', {
      description: 'URL of the PUT /greet endpoint',
      value: `https://${api.ref}.execute-api.${this.region}.amazonaws.com/${stage.stageName}/greet`,
    });
  }
}