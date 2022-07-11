import * as cdk from "aws-cdk-lib";
import { FederatedPrincipal } from "aws-cdk-lib/aws-iam";
import { BlockPublicAccess, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { ParameterType } from "aws-cdk-lib/aws-ssm";
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

interface Props {
  region: string;
  stage: string;
  account: string;
}

export class BffApiStack extends cdk.Stack {
  public readonly serviceARepo: string;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const serviceARepo = new cdk.aws_ecr.Repository(
      this,
      "template-manager-repo",
      {
        imageScanOnPush: true,
        repositoryName: `${props.stage}-template-manager`,
      }
    );

    new cdk.aws_ssm.StringParameter(this, "template-manager-repo-uri-param", {
      parameterName: `/${props.stage}/template-manager/repo-uri`,
      type: ParameterType.STRING,
      stringValue: serviceARepo.repositoryUri,
    });

    new cdk.aws_ssm.StringParameter(this, "template-manager-repo-arn-param", {
      parameterName: `/${props.stage}/template-manager/repo-arn`,
      type: ParameterType.STRING,
      stringValue: serviceARepo.repositoryArn,
    });

    const oidcProvider =
      props.stage === "dev"
        ? "oidc.eks.us-west-2.amazonaws.com/id/089129A371F0ED50EE954BB752B8854C"
        : "";

    const bucket = new cdk.aws_s3.Bucket(this, "team-backend-assets-bucket", {
      encryption: BucketEncryption.S3_MANAGED,
      bucketName: `team-backend-assets-${props.stage}`,
      versioned: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      eventBridgeEnabled: true,
    });

    const bucketPolicy = AwsCustomResourcePolicy.fromStatements([
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ["s3:PutObject"],
        resources: ["*"],
      }),
    ]);

    const iamrole = new cdk.aws_iam.Role(
      this,
      "pod-service-account-linked-role",
      {
        assumedBy: new FederatedPrincipal(
          `arn:aws:iam::${props.account}:oidc-provider/${oidcProvider}`,
          {
            StringEquals: {
              [`${oidcProvider}:aud`]: "sts.amazonaws.com",
              [`${oidcProvider}:sub`]:
                "system:serviceaccount:team-backend:template-manager-pods-sa",
            },
          },
          "sts:AssumeRoleWithWebIdentity"
        ),
        inlinePolicies: {
          adis: new cdk.aws_iam.PolicyDocument({
            statements: [
              new cdk.aws_iam.PolicyStatement({
                effect: cdk.aws_iam.Effect.ALLOW,
                actions: ["s3:PutObject"],
                resources: ["*"],
              }),
            ],
          }),
        },
      }
    );

    new cdk.CfnOutput(this, "podRole", {
      value: iamrole.roleArn,
      description: "The arn of the pod role",
      exportName: "podRole",
    });
  }
}
