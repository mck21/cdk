import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class ReservasCrudStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── 1. TABLA DYNAMODB (L2) ─────────────────────────────────
    const tabla = new dynamodb.Table(this, 'ReservasTable', {
      tableName: 'reservas',
      partitionKey: {
        name: 'reserva_id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,   // útil en dev
    });

    // ── 2. LAMBDAS (L2) ────────────────────────────────────────
    // El rol IAM se crea automáticamente por cada función
    const commonProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TABLE_NAME: tabla.tableName,
      },
    };

    const fnList = new lambda.Function(this, 'ListReservas', {
      ...commonProps,
      handler: 'listReservas.handler',
    });

    const fnGet = new lambda.Function(this, 'GetReserva', {
      ...commonProps,
      handler: 'getReserva.handler',
    });

    const fnCreate = new lambda.Function(this, 'CreateReserva', {
      ...commonProps,
      handler: 'createReserva.handler',
    });

    const fnUpdate = new lambda.Function(this, 'UpdateReserva', {
      ...commonProps,
      handler: 'updateReserva.handler',
    });

    const fnDelete = new lambda.Function(this, 'DeleteReserva', {
      ...commonProps,
      handler: 'deleteReserva.handler',
    });

    // ── 3. PERMISOS (L2 grant) ─────────────────────────────────
    // En lugar de PolicyStatements manuales, L2 lo hace automático
    tabla.grantReadData(fnList);
    tabla.grantReadData(fnGet);
    tabla.grantWriteData(fnCreate);
    tabla.grantReadWriteData(fnUpdate);
    tabla.grantWriteData(fnDelete);

    // ── 4. API GATEWAY (L2) ────────────────────────────────────
    const api = new apigateway.RestApi(this, 'ReservasApi', {
      restApiName: 'Reservas Service',
      description: 'CRUD de reservas con Lambda y DynamoDB',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const reservas = api.root.addResource('reservas');
    reservas.addMethod('GET',    new apigateway.LambdaIntegration(fnList));
    reservas.addMethod('POST',   new apigateway.LambdaIntegration(fnCreate));

    const reserva = reservas.addResource('{id}');
    reserva.addMethod('GET',    new apigateway.LambdaIntegration(fnGet));
    reserva.addMethod('PUT',    new apigateway.LambdaIntegration(fnUpdate));
    reserva.addMethod('DELETE', new apigateway.LambdaIntegration(fnDelete));

    // ── 5. OUTPUTS ─────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiUrl', {
      description: 'URL base de la API',
      value: api.url,
    });

    new cdk.CfnOutput(this, 'TablaArn', {
      description: 'ARN de la tabla DynamoDB',
      value: tabla.tableArn,
    });

    new cdk.CfnOutput(this, 'TablaName', {
      description: 'Escanea con: aws dynamodb scan --table-name reservas',
      value: tabla.tableName,
    });
  }
}