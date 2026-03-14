import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ----------------------------------------
    // API Gateway REST API (L2)
    // Los deployments se gestionan automáticamente
    // ----------------------------------------
    const api = new cdk.aws_apigateway.RestApi(this, 'MyApi', {
      restApiName: 'MyApi',
      description: 'A simple API Gateway REST API',
      deployOptions: {
        stageName: 'prod',
      },
    });

    // ----------------------------------------
    // GET /myresource — Mock integration
    // ----------------------------------------
    const myResource = api.root.addResource('myresource');
    myResource.addMethod(
      'GET',
      new cdk.aws_apigateway.MockIntegration({
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
      }),
      {
        methodResponses: [{ statusCode: '200' }],
      }
    );

    // ----------------------------------------
    // Lambda que llama al GET /myresource
    // L2 crea el role automáticamente
    // ----------------------------------------
    const helloLambda = new cdk.aws_lambda.Function(this, 'HelloLambda', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: cdk.aws_lambda.Code.fromInline(`
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
      `),
      environment: {
        API_URL: `https://${api.restApiId}.execute-api.${this.region}.amazonaws.com/prod/myresource`,
      },
    });

    // ----------------------------------------
    // PUT /greet — Lambda integration
    // ----------------------------------------
    const greetLambda = new cdk.aws_lambda.Function(this, 'GreetLambda', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: cdk.aws_lambda.Code.fromInline(`
        exports.handler = async function(event) {
          const body = JSON.parse(event.body || '{}');
          const name = body.name || 'World';
          const message = 'Hello, ' + name + '!';
          return { statusCode: 200, body: JSON.stringify({ message }) };
        };
      `),
    });

    // L2 añade el permiso lambda:InvokeFunction automáticamente
    const greetResource = api.root.addResource('greet');
    greetResource.addMethod(
      'PUT',
      new cdk.aws_apigateway.LambdaIntegration(greetLambda),
    );

    // ----------------------------------------
    // Outputs
    // ----------------------------------------
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      description: 'URL of the GET /myresource endpoint',
      value: `${api.url}myresource`,
    });
    new cdk.CfnOutput(this, 'GreetEndpoint', {
      description: 'URL of the PUT /greet endpoint',
      value: `${api.url}greet`,
    });
  }
}