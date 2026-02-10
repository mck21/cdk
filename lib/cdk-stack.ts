import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // new cdk.aws_s3.CfnBucket(this, 'MyBucket', {
    //   bucketName: 'bucket-marpalpir21',
    // });

    const bucket = new cdk.aws_s3.Bucket(this, 'MyBucket', {
      bucketName: 'bucket-marpalpir21',
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Elimina el bucket al destruir la pila
      autoDeleteObjects: true, // Elimina los objetos dentro del bucket al destruir la pila
    });

    new cdk.aws_s3_deployment.BucketDeployment(this, 'DeployBucket', {
      sources: [cdk.aws_s3_deployment.Source.asset('./assets')],
      destinationBucket: bucket,
    });
  }
}
